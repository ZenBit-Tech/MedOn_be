import { Repository } from 'typeorm';
import * as argon from 'argon2';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Doctor } from '@entities/Doctor';
import { LoginDoctorDto } from '@modules/auth/dto/login-doctor.dto';
import { ReconfirmDoctorDto } from '@modules/auth/dto/reconfirm-doctor.dto';
import { SignupDoctorDto } from '@modules/auth/dto/signup-doctor.dto';
import { EmailService } from '@modules/email/email.service';
import { ForgetPasswordDoctorDto } from '@modules/auth/dto/forgetPassword-doctor.dto';
import { ResetPasswordDoctorDto } from '@modules/auth/dto/resetPassword-doctor.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    private email: EmailService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDoctorDto) {
    const doctor = await this.doctorRepo.findOne({
      where: {
        email: dto.email,
      },
    });
    if (!doctor) {
      throw new UnauthorizedException('Invalid email');
    }

    const pwMatches = await argon.verify(doctor.password, dto.password);
    if (!pwMatches) {
      throw new UnauthorizedException('Invalid  password');
    }
    const accessToken = await this.generateAccessToken(doctor.id, doctor.email);
    return {
      access_token: accessToken,
    };
  }

  async signup(dto: SignupDoctorDto): Promise<string> {
    const hash = await argon.hash(dto.password);
    const token = await this.getToken({ email: dto.email });
    const link = `${this.config.get('BASE_SERVER_URL')}/auth/confirm/${token}`;
    const doctor = this.doctorRepo.create({
      ...dto,
      password: hash,
      token,
    });
    await this.doctorRepo.save(doctor);
    await this.email.sendConfirmationLink(dto.email, link);

    return link;
  }

  async confirm(token: string): Promise<void> {
    await this.jwt.verifyAsync(token, {
      secret: this.config.get('JWT_SECRET'),
    });

    await this.doctorRepo
      .createQueryBuilder('doctor')
      .update(Doctor)
      .set({
        token: null,
        isVerified: true,
        updatedAt: new Date(),
      })
      .where('token = :token', { token })
      .execute()
      .then((response) => {
        if (!response.affected)
          throw new UnauthorizedException('Invalid confirmation link!');
      });
  }

  async reconfirm(dto: ReconfirmDoctorDto): Promise<string> {
    const token = await this.getToken({ email: dto.email });
    const link = `${this.config.get('BASE_SERVER_URL')}/auth/confirm/${token}`;

    await this.doctorRepo
      .createQueryBuilder('doctor')
      .update(Doctor)
      .set({
        token,
        updatedAt: new Date(),
      })
      .where('doctor.email = :email', { email: dto.email })
      .andWhere('doctor.is_verified = 0')
      .execute()
      .then((response) => {
        if (!response.affected)
          throw new UnauthorizedException(
            "You don't need to verify you account.",
          );
      });

    await this.email.sendConfirmationLink(dto.email, link);
    return link;
  }

  async getToken(payload: string | object | Buffer): Promise<string> {
    return this.jwt.signAsync(payload, {
      expiresIn: this.config.get('CONFIRMATION_TOKEN_EXPIRED_AT'),
      secret: this.config.get('JWT_SECRET'),
    });
  }

  private async generateAccessToken(
    doctorId: number,
    email: string,
  ): Promise<string> {
    const payload = {
      sub: doctorId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');
    const expiresIn = this.config.get('JWT_EXPIRATION_TIME');
    const accessToken = await this.jwt.signAsync(payload, {
      secret,
      expiresIn,
    });
    return accessToken;
  }

  async forgetPassword(dto: ForgetPasswordDoctorDto): Promise<void> {
    await this.doctorRepo
      .findOne({
        where: { email: dto.email },
      })
      .then((doctor) => {
        if (!doctor) throw new UnauthorizedException('Doctor not found!');
      });
    const token = await this.getToken({ email: dto.email });
    const link = `${this.config.get('BASE_FRONT_URL')}/reset-password/${token}`;
    await this.email.sendForgetPasswordLink(dto.email, link);
  }

  async resetPassword(dto: ResetPasswordDoctorDto): Promise<void> {
    await this.doctorRepo.update(
      {
        email: dto.email,
      },
      {
        password: await argon.hash(dto.newPassword),
      },
    );
  }
}