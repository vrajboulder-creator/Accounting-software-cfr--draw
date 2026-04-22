import {
  getProject, getDivisions, getBidLineItems, getTransactions,
  getDraws, getDrawLineItems, getChangeOrders, getProjectMemberships,
  getCFRActuals, getReceivedFundsByDivision, getReceivedFunds, getUsers, getOrganizations,
} from "@/lib/db/queries";
import { notFound } from "next/navigation";

export type ProjectPageData = Awaited<ReturnType<typeof loadProjectData>>;

export async function loadProjectData(projectId: string) {
  const project = await getProject(projectId);
  if (!project) notFound();

  const [
    divisionList,
    transactionList,
    drawList,
    changeOrderList,
    memberships,
    userList,
    orgList,
    actuals,
    receivedByDiv,
    receivedFundsList,
  ] = await Promise.all([
    getDivisions(projectId),
    getTransactions(projectId),
    getDraws(projectId),
    getChangeOrders(projectId),
    getProjectMemberships(projectId),
    getUsers(),
    getOrganizations(),
    getCFRActuals(projectId),
    getReceivedFundsByDivision(projectId),
    getReceivedFunds(projectId),
  ]);

  const bidLineItemList = await getBidLineItems(projectId);

  // Augment divisions with computed spend from transactions + net received from credits
  const divisionsEnriched = divisionList.map((d) => {
    const rf = receivedByDiv[d.id] ?? { grossCents: 0, retainageCents: 0, netCents: 0 };
    return {
      ...d,
      grossSpendCents: actuals[d.id] ?? 0,
      retainageCents: rf.retainageCents,
      netReceivedCents: rf.netCents,
    };
  });

  // Get draw line items for the latest draw (for overview/default view)
  const latestDraw = drawList[0];
  const latestDrawLineItems = latestDraw ? await getDrawLineItems(latestDraw.id) : [];

  // Augment bid line items with actual spend from transactions
  const txByBLI: Record<string, number> = {};
  for (const tx of transactionList) {
    if (tx.bidLineItemId) {
      txByBLI[tx.bidLineItemId] = (txByBLI[tx.bidLineItemId] ?? 0) + tx.amountCents;
    }
  }
  const bidLineItemsEnriched = bidLineItemList.map((b) => ({
    ...b,
    actualCents: txByBLI[b.id] ?? 0,
  }));

  return {
    project,
    divisions: divisionsEnriched,
    bidLineItems: bidLineItemsEnriched,
    transactions: transactionList,
    draws: drawList,
    drawLineItems: latestDrawLineItems,
    changeOrders: changeOrderList,
    memberships,
    users: userList,
    organizations: orgList,
    receivedFunds: receivedFundsList,
  };
}
