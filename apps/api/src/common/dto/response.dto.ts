export class ApiResponse<T = any> {
  status!: boolean;
  message!: string;
  data?: T;
  errors?: Record<string, string[]>;
}
