import { mobileConfig } from "../config/runtime";
import { createApiClient } from "./client";

export const api = createApiClient(mobileConfig);
