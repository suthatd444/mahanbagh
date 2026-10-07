"use client";

import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { api } from "../../lib/api";
import { useRouter } from "next/navigation";
import axios from "axios";
import type { ApiResponse } from "@mohan-bagh/shared";

interface LoginUser {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  userCode: string | null;
  roleId: string;
}

export default function Login() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedMobile = mobile.replace(/\D/g, "");
    if (!/^[0-9]{10,15}$/.test(normalizedMobile)) {
      setError("Enter a valid mobile number");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<ApiResponse>("/auth/request-otp", {
        mobile: normalizedMobile,
      });
      setMobile(normalizedMobile);
      setMessage(data.message);
      setOtpRequested(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(otp)) {
      setError("Enter the 6 digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<ApiResponse<LoginUser>>(
        "/auth/verify-otp",
        {
          mobile,
          otp,
        },
      );
      if (data.status) {
        router.push("/dashboard");
      } else {
        setError(data.message || "Unable to verify OTP");
      }
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-md bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <span className="text-lg font-bold text-white">MB</span>
          </div>
          <CardTitle className="font-serif text-2xl">Mohan Bagh</CardTitle>
          <p className="text-sm text-gray-600">
            {otpRequested
              ? "Enter the one-time password sent to your mobile."
              : "Sign in with your mobile number."}
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={otpRequested ? verifyOtp : requestOtp}
            className="space-y-4"
          >
            {error && (
              <div
                role="alert"
                className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
            {message && (
              <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mobile number</label>
              <input
                className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                inputMode="numeric"
                maxLength={15}
                placeholder="Enter mobile number"
                value={mobile}
                disabled={otpRequested}
                onChange={(event) =>
                  setMobile(event.target.value.replace(/\D/g, ""))
                }
                required
              />
            </div>
            {otpRequested && (
              <div className="space-y-2">
                <label className="text-sm font-medium">One-time password</label>
                <input
                  className="w-full rounded border p-2 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, ""))
                  }
                  required
                  autoFocus
                />
              </div>
            )}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : otpRequested
                  ? "Verify OTP"
                  : "Send OTP"}
            </Button>
            {otpRequested && (
              <button
                type="button"
                onClick={() => {
                  setOtpRequested(false);
                  setOtp("");
                  setMessage("");
                  setError("");
                }}
                className="w-full text-sm font-medium text-primary hover:underline"
              >
                Use a different mobile number
              </button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiResponse>(error)) {
    return error.response?.data.message || "Something went wrong";
  }
  return "Something went wrong";
}
