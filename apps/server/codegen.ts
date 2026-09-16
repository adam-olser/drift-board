import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/schema.graphql',
  generates: {
    'src/gql/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../graphql#Context',
        strictScalars: true,
        scalars: { DateTime: 'string' },
        useTypeImports: true,
        enumsAsTypes: true,
      },
    },
  },
};

export default config;
