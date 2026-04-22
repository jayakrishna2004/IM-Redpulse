import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsIn(['DONOR', 'HOSPITAL']) role: string;
  @IsOptional() @IsString() bloodGroup?: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class HospitalLoginDto {
  @IsString() hospitalId: string;
  @IsOptional() @IsString() password?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new donor or hospital' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login and get JWT token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('login/hospital')
  @HttpCode(200)
  @ApiOperation({ summary: 'Direct login using Hospital UUID' })
  loginHospital(@Body() dto: HospitalLoginDto) {
    return this.authService.loginByHospitalId(dto.hospitalId, dto.password);
  }
}
