/**
 * Compile-time check: every browser action has the signature of the server
 * action it replaces in the artifact bundle (build.mjs aliases @/lib/actions/*).
 */
import type * as ServerAuth from "../../../lib/actions/auth";
import type * as BrowserAuth from "./auth";
import type * as ServerCatalog from "../../../lib/actions/catalog";
import type * as BrowserCatalog from "./catalog";
import type * as ServerClients from "../../../lib/actions/clients";
import type * as BrowserClients from "./clients";
import type * as ServerHistory from "../../../lib/actions/history";
import type * as BrowserHistory from "./history";
import type * as ServerOperations from "../../../lib/actions/operations";
import type * as BrowserOperations from "./operations";
import type * as ServerProposals from "../../../lib/actions/proposals";
import type * as BrowserProposals from "./proposals";
import type * as ServerPublic from "../../../lib/actions/public";
import type * as BrowserPublic from "./public";
import type * as ServerSearch from "../../../lib/actions/search";
import type * as BrowserSearch from "./search";
import type * as ServerSettings from "../../../lib/actions/settings";
import type * as BrowserSettings from "./settings";

type Conforms<Browser, Server> = { [K in keyof Server]: K extends keyof Browser ? (Browser[K] extends Server[K] ? true : false) : false };
type AllTrue<T> = T[keyof T] extends true ? true : never;

export const authConforms: AllTrue<Conforms<typeof BrowserAuth, Pick<typeof ServerAuth, keyof typeof ServerAuth>>> = true;
export const catalogConforms: AllTrue<Conforms<typeof BrowserCatalog, Pick<typeof ServerCatalog, keyof typeof ServerCatalog>>> = true;
export const clientsConforms: AllTrue<Conforms<typeof BrowserClients, Pick<typeof ServerClients, keyof typeof ServerClients>>> = true;
export const historyConforms: AllTrue<Conforms<typeof BrowserHistory, Pick<typeof ServerHistory, keyof typeof ServerHistory>>> = true;
export const operationsConforms: AllTrue<Conforms<typeof BrowserOperations, Pick<typeof ServerOperations, keyof typeof ServerOperations>>> = true;
export const proposalsConforms: AllTrue<Conforms<typeof BrowserProposals, Pick<typeof ServerProposals, keyof typeof ServerProposals>>> = true;
export const publicConforms: AllTrue<Conforms<typeof BrowserPublic, Pick<typeof ServerPublic, keyof typeof ServerPublic>>> = true;
export const searchConforms: AllTrue<Conforms<typeof BrowserSearch, Pick<typeof ServerSearch, keyof typeof ServerSearch>>> = true;
export const settingsConforms: AllTrue<Conforms<typeof BrowserSettings, Pick<typeof ServerSettings, keyof typeof ServerSettings>>> = true;
