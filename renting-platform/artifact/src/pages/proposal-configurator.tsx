import { useEffect, useState } from "react";
import { Configurator } from "@/components/configurator/configurator";
import { useSession } from "@/components/layout/session-context";
import { can } from "@/lib/auth/permissions";
import { toLocale } from "@/lib/i18n/locales";
import { catalogKey } from "@/lib/pricing";
import { configFromRecord } from "../actions/proposals";
import { configuratorCatalog, configuratorPricing } from "../data/derive";
import { current } from "../data/store";
import { useRouterStore } from "../router";
import { NotFoundPage } from "./shared";

/**
 * Like the server page, the configurator's props are read once per visit;
 * afterwards the configurator's own store and autosave own the proposal.
 */
export function ConfiguratorPage({ id }: { id: string }) {
  const session = useSession();
  const [props] = useState(() => {
    const state = current();
    const proposal = state.proposals[id];
    if (!proposal) return null;
    const pricing = configuratorPricing(state);
    const config = configFromRecord(proposal);
    // Drop lines whose product was deactivated since the proposal was saved.
    config.lines = config.lines.filter((line) => pricing.catalog[catalogKey(line.productId, line.variantId)]);
    return {
      status: proposal.status,
      init: {
        meta: {
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          title: proposal.title,
          clientId: proposal.clientId,
          clientName: state.clients[proposal.clientId]?.name ?? "—",
          contactName: proposal.contactName,
          status: proposal.status,
        },
        config,
        planId: proposal.planId,
      },
      serverUpdatedAt: proposal.updatedAt,
      catalog: configuratorCatalog(state),
      pricing,
      locale: toLocale(state.company.locale),
      companyName: state.company.name,
    };
  });

  // Read-only roles and converted proposals go straight to the document.
  const canEdit = can(session.role, "proposals.manage") && can(session.role, "internal.view");
  const redirect = props !== null && (!canEdit || props.status === "CONVERTED");
  useEffect(() => {
    if (redirect) useRouterStore.getState().replace(`/proposals/${id}/preview`);
  }, [redirect, id]);

  if (!props) return <NotFoundPage what="Proposta" />;
  if (redirect) return null;
  return (
    <Configurator
      init={props.init}
      serverUpdatedAt={props.serverUpdatedAt}
      catalog={props.catalog}
      pricing={props.pricing}
      locale={props.locale}
      companyName={props.companyName}
    />
  );
}
