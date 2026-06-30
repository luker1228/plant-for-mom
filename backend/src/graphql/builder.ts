import SchemaBuilder from "@pothos/core";

export type GraphQLContext = {
  userId: string;
};

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    DateTime: { Input: Date; Output: Date };
  };
}>({});

export type Builder = typeof builder;