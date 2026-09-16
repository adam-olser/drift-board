/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO-8601 timestamp, stamped server-side. */
  DateTime: { input: string; output: string; }
};

export type Board = {
  __typename?: 'Board';
  /** One flat list; the client groups by columnId and sorts by position. */
  cards: Array<Card>;
  columns: Array<Column>;
  id: Scalars['ID']['output'];
  keyPrefix: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type BoardEvent = CardCreated | CardDeleted | CardMoved | CardUpdated | PresenceChanged;

export type Card = {
  __typename?: 'Card';
  columnId: Scalars['ID']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  position: Scalars['Float']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Peer;
  /** Bumped only by updateCard. Moves never touch it. */
  version: Scalars['Int']['output'];
};

/** Every event carries origin = the session that caused it; a client ignores its own events. */
export type CardCreated = {
  __typename?: 'CardCreated';
  card: Card;
  origin: Scalars['ID']['output'];
};

export type CardDeleted = {
  __typename?: 'CardDeleted';
  cardId: Scalars['ID']['output'];
  origin: Scalars['ID']['output'];
};

export type CardMoved = {
  __typename?: 'CardMoved';
  cards: Array<Card>;
  origin: Scalars['ID']['output'];
};

export type CardUpdated = {
  __typename?: 'CardUpdated';
  card: Card;
  origin: Scalars['ID']['output'];
};

export type Column = {
  __typename?: 'Column';
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createBoard: Board;
  createCard: Card;
  deleteCard: Scalars['ID']['output'];
  logIn: Session;
  logOut: Session;
  /** Returns every card the move (or a resulting reindex) touched. */
  moveCard: Array<Card>;
  setViewing: Scalars['Boolean']['output'];
  signUp: Session;
  startGuestSession: Session;
  updateCard: Card;
};


export type MutationCreateBoardArgs = {
  name: Scalars['String']['input'];
};


export type MutationCreateCardArgs = {
  boardId: Scalars['ID']['input'];
  columnId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  opId: Scalars['ID']['input'];
  position: Scalars['Float']['input'];
  title: Scalars['String']['input'];
};


export type MutationDeleteCardArgs = {
  cardId: Scalars['ID']['input'];
  opId: Scalars['ID']['input'];
};


export type MutationLogInArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationMoveCardArgs = {
  cardId: Scalars['ID']['input'];
  columnId: Scalars['ID']['input'];
  opId: Scalars['ID']['input'];
  position: Scalars['Float']['input'];
};


export type MutationSetViewingArgs = {
  boardId: Scalars['ID']['input'];
  cardId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSignUpArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationStartGuestSessionArgs = {
  displayName: Scalars['String']['input'];
};


export type MutationUpdateCardArgs = {
  baseVersion: Scalars['Int']['input'];
  cardId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  opId: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type Peer = {
  __typename?: 'Peer';
  color: Scalars['String']['output'];
  name: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
};

export type Presence = {
  __typename?: 'Presence';
  color: Scalars['String']['output'];
  name: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
  viewingCardId?: Maybe<Scalars['ID']['output']>;
};

export type PresenceChanged = {
  __typename?: 'PresenceChanged';
  origin: Scalars['ID']['output'];
  peers: Array<Presence>;
};

export type Query = {
  __typename?: 'Query';
  board?: Maybe<Board>;
  viewer: Viewer;
};


export type QueryBoardArgs = {
  slug: Scalars['String']['input'];
};

export type Session = {
  __typename?: 'Session';
  color: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  user?: Maybe<User>;
};

export type Subscription = {
  __typename?: 'Subscription';
  boardEvents: BoardEvent;
};


export type SubscriptionBoardEventsArgs = {
  boardId: Scalars['ID']['input'];
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Viewer = {
  __typename?: 'Viewer';
  boards: Array<Board>;
  session?: Maybe<Session>;
};

export type CardFieldsFragment = { __typename?: 'Card', id: string, key: string, title: string, description: string, columnId: string, position: number, version: number, updatedAt: string, updatedBy: { __typename?: 'Peer', sessionId: string, name: string, color: string } };

export type ColumnFieldsFragment = { __typename?: 'Column', id: string, title: string, position: number };

export type BoardQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type BoardQuery = { __typename?: 'Query', board?: { __typename?: 'Board', id: string, slug: string, name: string, keyPrefix: string, columns: Array<{ __typename?: 'Column', id: string, title: string, position: number }>, cards: Array<{ __typename?: 'Card', id: string, key: string, title: string, description: string, columnId: string, position: number, version: number, updatedAt: string, updatedBy: { __typename?: 'Peer', sessionId: string, name: string, color: string } }> } | null };

export type SessionFieldsFragment = { __typename?: 'Session', id: string, displayName: string, color: string };

export type ViewerQueryVariables = Exact<{ [key: string]: never; }>;


export type ViewerQuery = { __typename?: 'Query', viewer: { __typename?: 'Viewer', session?: { __typename?: 'Session', id: string, displayName: string, color: string } | null } };

export type StartGuestSessionMutationVariables = Exact<{
  displayName: Scalars['String']['input'];
}>;


export type StartGuestSessionMutation = { __typename?: 'Mutation', startGuestSession: { __typename?: 'Session', id: string, displayName: string, color: string } };

export const CardFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Card"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"columnId"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]} as unknown as DocumentNode<CardFieldsFragment, unknown>;
export const ColumnFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ColumnFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Column"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]} as unknown as DocumentNode<ColumnFieldsFragment, unknown>;
export const SessionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Session"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]} as unknown as DocumentNode<SessionFieldsFragment, unknown>;
export const BoardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Board"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"board"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"keyPrefix"}},{"kind":"Field","name":{"kind":"Name","value":"columns"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ColumnFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cards"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CardFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ColumnFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Column"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Card"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"columnId"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]} as unknown as DocumentNode<BoardQuery, BoardQueryVariables>;
export const ViewerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"session"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SessionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Session"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]} as unknown as DocumentNode<ViewerQuery, ViewerQueryVariables>;
export const StartGuestSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartGuestSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"startGuestSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"displayName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SessionFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SessionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Session"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]} as unknown as DocumentNode<StartGuestSessionMutation, StartGuestSessionMutationVariables>;