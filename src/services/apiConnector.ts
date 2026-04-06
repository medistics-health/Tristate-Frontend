import axios from "axios";

export const axiosInstance = axios.create({});

interface ApiTypes {
  method: string;
  url: string;
  body?: any;
  headers?: Record<string, string>;
  credentials?: boolean;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  responseType?: any;
}

export const apiConnector = ({
  method,
  url,
  body,
  headers,
  credentials,
  params,
  signal,
  responseType,
}: ApiTypes) => {
  const config = {
    method,
    url,
    data: body,
    headers,
    withCredentials: credentials,
    params,
    signal,
    responseType,
  };

  return axiosInstance(config);
};
