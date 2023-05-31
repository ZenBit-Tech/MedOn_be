import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  Query,
  Patch,
} from '@nestjs/common';
import { CreateAppointmentDto } from '@modules/appointments/dto/create-appointment.dto';
import { Appointment } from '@entities/Appointments';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@guards/roles.guard';
import { Roles } from '@decorators/roles.decorator';
import { Role } from '@common/enums';
import { RequestWithUser } from '@common/interfaces/Appointment';
import { IServerResponse } from '@common/interfaces/serverResponses';
import { AppointmentsService } from './appointments.service';
import { PaginationOptionsDto } from './dto/pagination-options.dto';

@ApiTags('appointments')
@Controller('appointments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('/all')
  @ApiOperation({ summary: 'Get all appointments for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of appointments',
    type: Appointment,
    isArray: true,
  })
  async getAllAppointmentsForCurrentDoctor(
    @Req() request: RequestWithUser,
  ): Promise<IServerResponse> {
    const { user } = request;
    const appointments =
      await this.appointmentsService.getAllAppointmentsByDoctorId(user.userId);
    return {
      statusCode: HttpStatus.OK,
      data: appointments,
    };
  }

  @Get('/future')
  @ApiOperation({ summary: 'Get future appointments for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of appointments',
    type: Appointment,
    isArray: true,
  })
  async getFutureAppointmentsForCurrentDoctor(
    @Req() request: RequestWithUser,
    @Query() pagination: PaginationOptionsDto,
  ): Promise<IServerResponse> {
    const appointments =
      await this.appointmentsService.getFutureAppointmentsByDoctorId(
        request.user.userId,
        pagination,
      );

    return {
      statusCode: HttpStatus.OK,
      message: 'Future appointments retrieved successfully',
      data: appointments,
    };
  }

  @Post('/need')
  @ApiOperation({ summary: 'Get appointments for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of appointments',
    type: Appointment,
    isArray: true,
  })
  async getPastAppointmentsForCurrentDoctor(
    @Req() request: RequestWithUser,
    @Body() dto: { filter: 'today' | 'future' | 'past'; showAll: boolean },
    @Query() pagination: PaginationOptionsDto,
  ): Promise<IServerResponse> {
    const appointments = await this.appointmentsService.getAllAppointments(
      request.user.userId,
      pagination,
      dto.filter,
      dto.showAll,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Appointments retrieved successfully',
      data: appointments,
    };
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the appointment',
    type: Appointment,
  })
  async getAppointmentById(@Param('id') id: number): Promise<IServerResponse> {
    const appointmentId = await this.appointmentsService.getAppointmentById(id);
    return {
      statusCode: HttpStatus.OK,
      data: appointmentId,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new appointment' })
  @ApiResponse({
    status: 201,
    description: 'Returns the created appointment',
    type: Appointment,
  })
  @UseGuards(RolesGuard)
  @Roles(Role.LocalDoctor)
  async createAppointment(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ): Promise<Appointment> {
    return this.appointmentsService.createAppointment(createAppointmentDto);
  }

  @Patch('/link/:id')
  @Roles(Role.LocalDoctor)
  @ApiOperation({ summary: 'Link appointment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Insert Link to Zoom call to appointment',
    type: Appointment,
  })
  async linkAppointment(
    @Param('id') id: number,
    @Body() dto: { link: string },
  ): Promise<IServerResponse> {
    await this.appointmentsService.postLinkAppointment(id, dto.link);
    return {
      statusCode: HttpStatus.OK,
      message: 'Link to Zoom call added successfully',
    };
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete appointment by ID' })
  @ApiResponse({ status: 200, description: 'Appointment deleted' })
  async deleteAppointment(@Param('id') id: number): Promise<void> {
    await this.appointmentsService.deleteAppointment(id);
  }

  @Get('/patient/:id')
  @ApiOperation({ summary: "Get appointments by patient's ID" })
  @ApiResponse({
    status: 200,
    description: "Returns appointment's array",
    type: Appointment,
  })
  async getAppointmentsByPatientId(
    @Param('id') id: number,
  ): Promise<IServerResponse> {
    const appointmentId =
      await this.appointmentsService.getAppointmentsByPatientId(id);
    return {
      statusCode: HttpStatus.OK,
      data: appointmentId,
    };
  }
}
