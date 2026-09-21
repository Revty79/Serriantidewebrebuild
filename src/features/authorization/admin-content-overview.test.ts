import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminContentOverview } from "./admin-content-overview";


test("the Admin content DTO separates Campaigns, PCs, Race NPCs, and Creature NPCs with ownership context", () => {
  const overview = buildAdminContentOverview({
    accounts: [
      {
        id: "owner-1",
        name: "Aster Vale",
        username: "aster",
        displayUsername: "AsterGOD",
      },
      {
        id: "owner-2",
        name: "Bram Reed",
        username: "bram",
        displayUsername: null,
      },
    ],
    campaigns: [
      {
        id: 1,
        name: "Brightwater",
        createdByUserId: "owner-1",
        archivedAt: null,
        archiveReason: "",
      },
      {
        id: 2,
        name: "Old Crossing",
        createdByUserId: "owner-2",
        archivedAt: new Date("2026-08-01T00:00:00.000Z"),
        archiveReason: "Campaign concluded",
      },
    ],
    characters: [
      {
        id: 10,
        name: "Mira",
        campaignId: 1,
        campaignName: "Brightwater",
        campaignArchivedAt: null,
        campaignOwnerUserId: "owner-1",
        controllerUserId: "owner-2",
        isNpc: false,
        npcKind: "race",
        npcBuildMode: null,
        npcRoleLabel: "",
        archivedAt: null,
        archiveReason: "",
      },
      {
        id: 11,
        name: "The Ferryman",
        campaignId: 1,
        campaignName: "Brightwater",
        campaignArchivedAt: null,
        campaignOwnerUserId: "owner-1",
        controllerUserId: "owner-1",
        isNpc: true,
        npcKind: "race",
        npcBuildMode: "simple",
        npcRoleLabel: "River guide",
        archivedAt: null,
        archiveReason: "",
      },
      {
        id: 12,
        name: "Ash Drake",
        campaignId: 2,
        campaignName: "Old Crossing",
        campaignArchivedAt: new Date("2026-08-01T00:00:00.000Z"),
        campaignOwnerUserId: "owner-2",
        controllerUserId: "owner-1",
        isNpc: true,
        npcKind: "creature",
        npcBuildMode: "detailed",
        npcRoleLabel: "Guardian",
        archivedAt: new Date("2026-08-02T00:00:00.000Z"),
        archiveReason: "Campaign concluded",
      },
    ],
    sharedCatalogs: [
      {
        key: "races",
        label: "Races",
        href: "/heavens/races",
        active: 14,
        archived: 2,
      },
    ],
  });

  assert.deepEqual(overview.counts, {
    campaigns: { active: 1, archived: 1, total: 2 },
    playerCharacters: { active: 1, archived: 0, total: 1 },
    raceNpcs: { active: 1, archived: 0, total: 1 },
    creatureNpcs: { active: 0, archived: 1, total: 1 },
  });
  assert.equal(overview.campaigns[0]?.owner.label, "Aster Vale (AsterGOD)");
  assert.equal(overview.playerCharacters[0]?.controller.label, "Bram Reed (bram)");
  assert.equal(overview.raceNpcs[0]?.buildMode, "simple");
  assert.equal(overview.creatureNpcs[0]?.campaign.status, "archived");
  assert.equal(overview.creatureNpcs[0]?.campaignOwner.label, "Bram Reed (bram)");
  assert.equal(overview.sharedCatalogs[0]?.total, 16);
});

test("the Admin content DTO keeps missing account references explicit", () => {
  const overview = buildAdminContentOverview({
    accounts: [],
    campaigns: [{
      id: 3,
      name: "Orphaned Record",
      createdByUserId: "missing-owner",
      archivedAt: null,
      archiveReason: "",
    }],
    characters: [],
    sharedCatalogs: [],
  });

  assert.equal(overview.campaigns[0]?.owner.label, "Unknown account (missing-owner)");
});
