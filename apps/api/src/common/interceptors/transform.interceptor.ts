import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map } from "rxjs/operators";

function serializeValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date || value === null || typeof value !== "object")
    return value;
  if (Array.isArray(value)) return value.map(serializeValue);

  const serializable = value as { toJSON?: () => unknown };
  if (typeof serializable.toJSON === "function") {
    return serializeValue(serializable.toJSON());
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      serializeValue(child),
    ]),
  );
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        const response =
          data &&
          typeof data === "object" &&
          "status" in data &&
          "message" in data
            ? data
            : { status: true, message: "Success", data };
        return serializeValue(response);
      }),
    );
  }
}
