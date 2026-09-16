/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "fragment CardFields on Card {\n  id\n  key\n  title\n  description\n  columnId\n  position\n  version\n  updatedAt\n  updatedBy {\n    sessionId\n    name\n    color\n  }\n}\n\nfragment ColumnFields on Column {\n  id\n  title\n  position\n}\n\nquery Board($slug: String!) {\n  board(slug: $slug) {\n    id\n    slug\n    name\n    keyPrefix\n    columns {\n      ...ColumnFields\n    }\n    cards {\n      ...CardFields\n    }\n  }\n}": typeof types.CardFieldsFragmentDoc,
    "fragment SessionFields on Session {\n  id\n  displayName\n  color\n}\n\nquery Viewer {\n  viewer {\n    session {\n      ...SessionFields\n    }\n  }\n}\n\nmutation StartGuestSession($displayName: String!) {\n  startGuestSession(displayName: $displayName) {\n    ...SessionFields\n  }\n}": typeof types.SessionFieldsFragmentDoc,
};
const documents: Documents = {
    "fragment CardFields on Card {\n  id\n  key\n  title\n  description\n  columnId\n  position\n  version\n  updatedAt\n  updatedBy {\n    sessionId\n    name\n    color\n  }\n}\n\nfragment ColumnFields on Column {\n  id\n  title\n  position\n}\n\nquery Board($slug: String!) {\n  board(slug: $slug) {\n    id\n    slug\n    name\n    keyPrefix\n    columns {\n      ...ColumnFields\n    }\n    cards {\n      ...CardFields\n    }\n  }\n}": types.CardFieldsFragmentDoc,
    "fragment SessionFields on Session {\n  id\n  displayName\n  color\n}\n\nquery Viewer {\n  viewer {\n    session {\n      ...SessionFields\n    }\n  }\n}\n\nmutation StartGuestSession($displayName: String!) {\n  startGuestSession(displayName: $displayName) {\n    ...SessionFields\n  }\n}": types.SessionFieldsFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment CardFields on Card {\n  id\n  key\n  title\n  description\n  columnId\n  position\n  version\n  updatedAt\n  updatedBy {\n    sessionId\n    name\n    color\n  }\n}\n\nfragment ColumnFields on Column {\n  id\n  title\n  position\n}\n\nquery Board($slug: String!) {\n  board(slug: $slug) {\n    id\n    slug\n    name\n    keyPrefix\n    columns {\n      ...ColumnFields\n    }\n    cards {\n      ...CardFields\n    }\n  }\n}"): (typeof documents)["fragment CardFields on Card {\n  id\n  key\n  title\n  description\n  columnId\n  position\n  version\n  updatedAt\n  updatedBy {\n    sessionId\n    name\n    color\n  }\n}\n\nfragment ColumnFields on Column {\n  id\n  title\n  position\n}\n\nquery Board($slug: String!) {\n  board(slug: $slug) {\n    id\n    slug\n    name\n    keyPrefix\n    columns {\n      ...ColumnFields\n    }\n    cards {\n      ...CardFields\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment SessionFields on Session {\n  id\n  displayName\n  color\n}\n\nquery Viewer {\n  viewer {\n    session {\n      ...SessionFields\n    }\n  }\n}\n\nmutation StartGuestSession($displayName: String!) {\n  startGuestSession(displayName: $displayName) {\n    ...SessionFields\n  }\n}"): (typeof documents)["fragment SessionFields on Session {\n  id\n  displayName\n  color\n}\n\nquery Viewer {\n  viewer {\n    session {\n      ...SessionFields\n    }\n  }\n}\n\nmutation StartGuestSession($displayName: String!) {\n  startGuestSession(displayName: $displayName) {\n    ...SessionFields\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;