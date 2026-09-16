import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/schema.graphql',
  generates: {
    'src/gql/types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../graphql#Context',
        strictScalars: true,
        scalars: { DateTime: 'string', Date: 'string' },
        useTypeImports: true,
        enumsAsTypes: true,
        // Parents returned by resolvers; the remaining fields have their own field resolvers.
        mappers: {
          Board: '../modules/boards/sql#BoardParent',
          Session: '../modules/sessions/sql#SessionParent',
          Viewer: '../modules/sessions/sql#ViewerParent',
        },
      },
    },
  },
};

export default config;
