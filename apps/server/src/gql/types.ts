import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { Context } from '../graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  BoardEvent: ( CardCreated ) | ( CardDeleted ) | ( CardMoved ) | ( CardUpdated ) | ( PresenceChanged );
};


/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Board: ResolverTypeWrapper<Board>;
  BoardEvent: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['BoardEvent']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Card: ResolverTypeWrapper<Card>;
  CardCreated: ResolverTypeWrapper<CardCreated>;
  CardDeleted: ResolverTypeWrapper<CardDeleted>;
  CardMoved: ResolverTypeWrapper<CardMoved>;
  CardUpdated: ResolverTypeWrapper<CardUpdated>;
  Column: ResolverTypeWrapper<Column>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Peer: ResolverTypeWrapper<Peer>;
  Presence: ResolverTypeWrapper<Presence>;
  PresenceChanged: ResolverTypeWrapper<PresenceChanged>;
  Query: ResolverTypeWrapper<{}>;
  Session: ResolverTypeWrapper<Session>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  User: ResolverTypeWrapper<User>;
  Viewer: ResolverTypeWrapper<Viewer>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Board: Board;
  BoardEvent: ResolversUnionTypes<ResolversParentTypes>['BoardEvent'];
  Boolean: Scalars['Boolean']['output'];
  Card: Card;
  CardCreated: CardCreated;
  CardDeleted: CardDeleted;
  CardMoved: CardMoved;
  CardUpdated: CardUpdated;
  Column: Column;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: {};
  Peer: Peer;
  Presence: Presence;
  PresenceChanged: PresenceChanged;
  Query: {};
  Session: Session;
  String: Scalars['String']['output'];
  Subscription: {};
  User: User;
  Viewer: Viewer;
};

export type BoardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Board'] = ResolversParentTypes['Board']> = {
  cards?: Resolver<Array<ResolversTypes['Card']>, ParentType, ContextType>;
  columns?: Resolver<Array<ResolversTypes['Column']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  keyPrefix?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BoardEventResolvers<ContextType = Context, ParentType extends ResolversParentTypes['BoardEvent'] = ResolversParentTypes['BoardEvent']> = {
  __resolveType: TypeResolveFn<'CardCreated' | 'CardDeleted' | 'CardMoved' | 'CardUpdated' | 'PresenceChanged', ParentType, ContextType>;
};

export type CardResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Card'] = ResolversParentTypes['Card']> = {
  columnId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['Peer'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CardCreatedResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardCreated'] = ResolversParentTypes['CardCreated']> = {
  card?: Resolver<ResolversTypes['Card'], ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CardDeletedResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardDeleted'] = ResolversParentTypes['CardDeleted']> = {
  cardId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CardMovedResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardMoved'] = ResolversParentTypes['CardMoved']> = {
  cards?: Resolver<Array<ResolversTypes['Card']>, ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CardUpdatedResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CardUpdated'] = ResolversParentTypes['CardUpdated']> = {
  card?: Resolver<ResolversTypes['Card'], ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ColumnResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Column'] = ResolversParentTypes['Column']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createBoard?: Resolver<ResolversTypes['Board'], ParentType, ContextType, RequireFields<MutationCreateBoardArgs, 'name'>>;
  createCard?: Resolver<ResolversTypes['Card'], ParentType, ContextType, RequireFields<MutationCreateCardArgs, 'boardId' | 'columnId' | 'id' | 'opId' | 'position' | 'title'>>;
  deleteCard?: Resolver<ResolversTypes['ID'], ParentType, ContextType, RequireFields<MutationDeleteCardArgs, 'cardId' | 'opId'>>;
  logIn?: Resolver<ResolversTypes['Session'], ParentType, ContextType, RequireFields<MutationLogInArgs, 'email' | 'password'>>;
  logOut?: Resolver<ResolversTypes['Session'], ParentType, ContextType>;
  moveCard?: Resolver<Array<ResolversTypes['Card']>, ParentType, ContextType, RequireFields<MutationMoveCardArgs, 'cardId' | 'columnId' | 'opId' | 'position'>>;
  setViewing?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationSetViewingArgs, 'boardId'>>;
  signUp?: Resolver<ResolversTypes['Session'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'email' | 'name' | 'password'>>;
  startGuestSession?: Resolver<ResolversTypes['Session'], ParentType, ContextType, RequireFields<MutationStartGuestSessionArgs, 'displayName'>>;
  updateCard?: Resolver<ResolversTypes['Card'], ParentType, ContextType, RequireFields<MutationUpdateCardArgs, 'baseVersion' | 'cardId' | 'opId'>>;
};

export type PeerResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Peer'] = ResolversParentTypes['Peer']> = {
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresenceResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Presence'] = ResolversParentTypes['Presence']> = {
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  viewingCardId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PresenceChangedResolvers<ContextType = Context, ParentType extends ResolversParentTypes['PresenceChanged'] = ResolversParentTypes['PresenceChanged']> = {
  origin?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  peers?: Resolver<Array<ResolversTypes['Presence']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  board?: Resolver<Maybe<ResolversTypes['Board']>, ParentType, ContextType, RequireFields<QueryBoardArgs, 'slug'>>;
  viewer?: Resolver<ResolversTypes['Viewer'], ParentType, ContextType>;
};

export type SessionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Session'] = ResolversParentTypes['Session']> = {
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  boardEvents?: SubscriptionResolver<ResolversTypes['BoardEvent'], "boardEvents", ParentType, ContextType, RequireFields<SubscriptionBoardEventsArgs, 'boardId'>>;
};

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ViewerResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Viewer'] = ResolversParentTypes['Viewer']> = {
  boards?: Resolver<Array<ResolversTypes['Board']>, ParentType, ContextType>;
  session?: Resolver<Maybe<ResolversTypes['Session']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  Board?: BoardResolvers<ContextType>;
  BoardEvent?: BoardEventResolvers<ContextType>;
  Card?: CardResolvers<ContextType>;
  CardCreated?: CardCreatedResolvers<ContextType>;
  CardDeleted?: CardDeletedResolvers<ContextType>;
  CardMoved?: CardMovedResolvers<ContextType>;
  CardUpdated?: CardUpdatedResolvers<ContextType>;
  Column?: ColumnResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Peer?: PeerResolvers<ContextType>;
  Presence?: PresenceResolvers<ContextType>;
  PresenceChanged?: PresenceChangedResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  Viewer?: ViewerResolvers<ContextType>;
};

