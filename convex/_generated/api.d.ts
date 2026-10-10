/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as admin from "../admin.js";
import type * as classMembers from "../classMembers.js";
import type * as classes from "../classes.js";
import type * as complexes from "../complexes.js";
import type * as domain from "../domain.js";
import type * as gyms from "../gyms.js";
import type * as history from "../history.js";
import type * as invites from "../invites.js";
import type * as leaderboard from "../leaderboard.js";
import type * as library from "../library.js";
import type * as release from "../release.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";
import type * as variants from "../variants.js";
import type * as wodify from "../wodify.js";
import type * as wodifyImport from "../wodifyImport.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  admin: typeof admin;
  classMembers: typeof classMembers;
  classes: typeof classes;
  complexes: typeof complexes;
  domain: typeof domain;
  gyms: typeof gyms;
  history: typeof history;
  invites: typeof invites;
  leaderboard: typeof leaderboard;
  library: typeof library;
  release: typeof release;
  roles: typeof roles;
  seed: typeof seed;
  templates: typeof templates;
  users: typeof users;
  variants: typeof variants;
  wodify: typeof wodify;
  wodifyImport: typeof wodifyImport;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
