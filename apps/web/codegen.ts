import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../server/src/schema.graphql',
  documents: 'src/**/*.graphql',
  ignoreNoDocuments: true,
  generates: {
    'src/gql/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        strictScalars: true,
        scalars: { DateTime: 'string', Date: 'string' },
        useTypeImports: true,
      },
    },
  },
};

export default config;
