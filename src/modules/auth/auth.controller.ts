import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { Doctor } from '@entities/Doctor';
import { AuthService } from '@modules/auth.service';
import { LoginDoctorDto } from '@modules/dto/login-doctor.dto';

import { IResetPasswordRequest } from '@common/interfaces/resetPasswordRequest';
import { ForgetPasswordDoctorDto } from '@modules/auth/dto/forgetPassword-doctor.dto';
import { ResetPasswordDoctorDto } from '@modules/auth/dto/resetPassword-doctor.dto';
import { IServerResponse } from '@common/interfaces/serverResponses';
import { SignupDoctorDto } from '@modules/auth/dto/signup-doctor.dto';
import { ReconfirmDoctorDto } from '@modules/auth/dto/reconfirm-doctor.dto';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @ApiOperation({ summary: 'Doctor login' })
  @Post('signup')
  @ApiOperation({ summary: 'New doctor registration' })
  @ApiResponse({
    status: 201,
    description: 'Doctor was created, verification link was sent.',
  })
  async signup(@Body() dto: SignupDoctorDto): Promise<IServerResponse> {
    const confirmLink = await this.authService.signup(dto);
    return { statusCode: HttpStatus.OK, message: confirmLink };
  }

  @Post('re-confirm')
  @ApiOperation({ summary: 'Request for new confirmation link' })
  @ApiResponse({
    status: 200,
    description: 'Doctor was logged in',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  async login(@Body() dto: LoginDoctorDto) {
    const token = await this.authService.login(dto);
    return token;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getMe(@Req() req: Request & { user: Doctor }) {
    return req.user;
  }

  @Post('forget')
  @ApiOperation({ summary: 'Forgot password' })
  @ApiResponse({
    status: 201,
    description: 'Email was sent',
  })
  @ApiResponse({
    status: 401,
    description: 'Email do not exist',
  })
  async forgetPassword(
    @Body() dto: ForgetPasswordDoctorDto,
  ): Promise<IServerResponse> {
    await this.authService.forgetPassword({ email: dto.email });
    return {
      statusCode: HttpStatus.OK,
      message: 'Email was sent',
    };
  }

  @UseGuards(AuthGuard)
  @Post('reset')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({
    status: 201,
    description: 'Password was updated',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token',
  })

  async resetPassword(
    @Request() req: IResetPasswordRequest,
    @Body() dto: ResetPasswordDoctorDto,
  ): Promise<IServerResponse> {
    await this.authService.resetPassword({
      email: req.doctor?.email,
      newPassword: dto.newPassword,
    });
    return {
      statusCode: HttpStatus.OK,
      message: 'Password was updated',
    };
  }
}
