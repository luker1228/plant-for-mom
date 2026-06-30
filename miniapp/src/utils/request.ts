import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import type { DocumentNode } from "graphql";

const BASE_URL = "http://localhost:3000/graphql";

const USER_ID_KEY = "plant_user_id";

export function getUserId(): string {
  return uni.getStorageSync(USER_ID_KEY) || "";
}

export function setUserId(id: string): void {
  uni.setStorageSync(USER_ID_KEY, id);
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function execute<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables?: TVariables
): Promise<TResult> {
  const userId = getUserId();
  const res = await uni.request({
    url: BASE_URL,
    method: "POST",
    header: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    data: {
      query: (document as unknown as { loc: { source: { body: string } } }).loc.source.body,
      variables,
    },
  });

  const body = res.data as GraphQLResponse<TResult>;

  if (body.errors && body.errors.length > 0) {
    throw new Error(body.errors.map((e) => e.message).join("\n"));
  }

  return body.data as TResult;
}
