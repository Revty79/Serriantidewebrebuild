import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminUserAccountSummary } from "./admin-user-account";

const account = {
  id: "user-1",
  name: "Serrian Player",
  username: "serrian-player",
  displayUsername: "SerrianPlayer",
  email: "player@example.com",
  createdAt: new Date("2026-01-10T12:00:00.000Z"),
};

test("an account with no associated records receives calm zero-count groups", () => {
  const summary = buildAdminUserAccountSummary({
    account,
    roles: [],
    campaignsCreated: [],
    campaignsJoined: [],
    characters: [],
  });

  assert.deepEqual(summary.counts, {
    campaignsCreated: 0,
    campaignsJoined: 0,
    playerCharacters: 0,
    raceNpcsControlled: 0,
    creatureNpcsControlled: 0,
  });
  assert.deepEqual(summary.roles, []);
  assert.deepEqual(summary.campaignsCreated, []);
  assert.deepEqual(summary.campaignsJoined, []);
  assert.deepEqual(summary.playerCharacters, []);
  assert.deepEqual(summary.raceNpcsControlled, []);
  assert.deepEqual(summary.creatureNpcsControlled, []);
});

test("created and joined Campaign associations remain independent even when they overlap", () => {
  const sharedCampaign = { id: 7, name: "The Breaking" };
  const summary = buildAdminUserAccountSummary({
    account,
    roles: ["player", "admin", "player", "god"],
    campaignsCreated: [sharedCampaign],
    campaignsJoined: [sharedCampaign, { id: 9, name: "The Crossing" }],
    characters: [],
  });

  assert.deepEqual(summary.roles, ["admin", "god", "player"]);
  assert.deepEqual(summary.campaignsCreated, [sharedCampaign]);
  assert.deepEqual(summary.campaignsJoined, [
    sharedCampaign,
    { id: 9, name: "The Crossing" },
  ]);
  assert.equal(summary.counts.campaignsCreated, 1);
  assert.equal(summary.counts.campaignsJoined, 2);
});

test("player Characters, race NPCs, and Creature NPCs have separate names and counts", () => {
  const summary = buildAdminUserAccountSummary({
    account,
    roles: ["player"],
    campaignsCreated: [],
    campaignsJoined: [],
    characters: [
      {
        id: 11,
        name: "Silas Thistle",
        campaignId: 7,
        campaignName: "The Breaking",
        isNpc: false,
        npcKind: "race",
      },
      {
        id: 12,
        name: "The Ferryman",
        campaignId: 7,
        campaignName: "The Breaking",
        isNpc: true,
        npcKind: "race",
      },
      {
        id: 13,
        name: "Ash Drake",
        campaignId: 7,
        campaignName: "The Breaking",
        isNpc: true,
        npcKind: "creature",
      },
    ],
  });

  assert.deepEqual(summary.playerCharacters, [
    {
      id: 11,
      name: "Silas Thistle",
      campaignId: 7,
      campaignName: "The Breaking",
    },
  ]);
  assert.deepEqual(summary.raceNpcsControlled, [
    {
      id: 12,
      name: "The Ferryman",
      campaignId: 7,
      campaignName: "The Breaking",
    },
  ]);
  assert.deepEqual(summary.creatureNpcsControlled, [
    {
      id: 13,
      name: "Ash Drake",
      campaignId: 7,
      campaignName: "The Breaking",
    },
  ]);
  assert.equal(summary.counts.playerCharacters, 1);
  assert.equal(summary.counts.raceNpcsControlled, 1);
  assert.equal(summary.counts.creatureNpcsControlled, 1);
});
