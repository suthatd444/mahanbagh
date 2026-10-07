import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { AuthGuard } from "../common/guards/auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("request-otp")
  async requestOtp(@Body() body: { mobile: string }) {
    await this.auth.requestMobileOtp(body.mobile);
    return {
      status: true,
      message: "If this mobile number is registered, an OTP has been sent.",
    };
  }

  @Post("verify-otp")
  async verifyOtp(
    @Body() body: { mobile: string; otp: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyMobileOtp(
      body.mobile,
      body.otp,
      req.ip,
      req.headers["user-agent"] as string,
    );
    res.cookie("sessionId", result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { status: true, message: "Login successful", data: result.user };
  }

  @UseGuards(AuthGuard)
  @Post("logout")
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.sessionId);
    res.clearCookie("sessionId");
    return { status: true, message: "Logged out" };
  }

  @UseGuards(AuthGuard)
  @Get("me")
  getMe(@Req() req: any) {
    return req.user;
  }
}
