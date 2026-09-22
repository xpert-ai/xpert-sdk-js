import type {
  ConnectorAuthMethodDefinition,
  ConnectorAuthorizationMode,
  ConnectorScope,
  IconDefinition,
  RuntimeI18nText,
} from './schema.js';
/** A selectable package, middleware configuration, or published digital expert. */
export type RuntimeResourceKind = 'agent_plugin' | 'middleware' | 'external_xpert';
export type RuntimeResourceAuthorization =
  /** @deprecated Legacy response shape; new servers use workspace Connector dependencies. */
  | { type?: 'mcp_oauth'; status: string; authorizationUrl?: string | null }
  | {
      type: 'connector';
      status: 'connected' | 'requires_auth';
      connector: {
        authorizationMode?: ConnectorAuthorizationMode;
        canManage?: boolean;
        managementUrl?: string;
        bindingId: string;
        provider: string;
        scope: ConnectorScope;
        authMethods?: ConnectorAuthMethodDefinition[];
      };
    };
/** requires_auth needs a workspace connection; partial means some components are usable. */
export type RuntimeResourceStatus =
  | 'ready'
  | 'requires_auth'
  | 'configuration_required'
  | 'partial'
  | 'unavailable';

export interface RuntimeResourceReference {
  /** Opaque resource identity, distinct from a Connector binding ID. */
  bindingId: string;
  /** Copy the catalog version unchanged; existing selections must not silently upgrade. */
  version: string;
}

export interface RuntimeResourcesSelection {
  /** Use the latest server revision for updates; new conversation selections start at zero. */
  revision: number;
  /** Complete replacement set; an empty array removes all dynamically selected resources. */
  resources: RuntimeResourceReference[];
}

export interface AgentPluginDiagnostic {
  component: string;
  code: string;
  message: string;
}

export interface RuntimeResourceCatalogItem extends RuntimeResourceReference {
  kind: RuntimeResourceKind;
  title: string;
  description?: RuntimeI18nText;
  icon?: string;
  avatar?: {
    url?: string;
    background?: string;
    useNotoColor?: boolean;
    emoji?: {
      id: string;
      set?: '' | 'apple' | 'google' | 'twitter' | 'facebook';
      colons?: string;
      unified?: string;
    };
  };
  iconDefinition?: IconDefinition;
  views?: RuntimeResourceView[];
  status: RuntimeResourceStatus;
  diagnostics: AgentPluginDiagnostic[];
  components: Array<{
    key: string;
    kind: 'skill' | 'mcp' | 'middleware' | 'external_xpert';
    status: RuntimeResourceStatus;
  }>;
}

/** Display metadata only; a related view does not grant access or activate it. */
export interface RuntimeResourceView {
  key: string;
  title: string;
  description?: RuntimeI18nText;
  icon?: IconDefinition;
  requiredFeatures: string[];
}

export interface RuntimeResourceCatalog {
  items: RuntimeResourceCatalogItem[];
  total: number;
}
