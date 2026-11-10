const assert = require('assert');
const fs = require('fs');
const path = require('path');
const roster = require('../roster-public.js');

const rows = [
  {
    id: 'U1',
    name: 'Enrique Esparza',
    email: 'enrique@enesmabroker.com',
    phone: '(909) 212-2994',
    title: 'Broker / Owner',
    languages: 'English, Spanish',
    dre: '01926362',
    website: 'https://enriqueesparza.com',
    active: true,
    address: '8311 Haven Ave',
    mailingAddress: 'PO Box 1',
    ssn: '123-45-6789',
    tin: '12-3456789',
    splitPct: 90,
    capAmount: 12000,
    photoUrl: 'https://drive.google.com/thumbnail?id=abc&sz=w1000'
  },
  {
    id: 'U2',
    firstName: 'Lilia',
    lastName: 'Amador',
    email: 'realtorlilia1@gmail.com',
    role: 'agent',
    active: 'TRUE',
    photo: 'javascript:alert(1)'
  },
  {
    id: 'U3',
    name: 'Former Agent',
    email: 'former@example.com',
    status: 'Offboarded',
    role: 'agent'
  },
  {
    id: 'U4',
    name: 'Coordinator Only',
    email: 'tc@example.com',
    role: 'tc',
    active: true
  }
];

const agents = roster.normalizeRoster(rows);
assert.strictEqual(agents.length, 2);
assert.strictEqual(agents[0].name, 'Enrique Esparza');
assert.deepStrictEqual(agents[0].languages, ['English', 'Spanish']);
assert.strictEqual(agents[0].photoUrl, 'https://drive.google.com/thumbnail?id=abc&sz=w1000');
assert.strictEqual(agents[1].slug, 'lilia-amador');
assert.strictEqual(agents[1].title, 'Agent');
assert.strictEqual(agents[1].photoUrl, '');
agents.forEach(function (agent) {
  assert.strictEqual(roster.hasPrivateKey(agent), false);
  assert.strictEqual(agent.address, undefined);
  assert.strictEqual(agent.ssn, undefined);
  assert.strictEqual(agent.tin, undefined);
  assert.strictEqual(agent.splitPct, undefined);
});

assert.strictEqual(roster.safePhoto('https://evil.example/photo.jpg'), '');
assert.strictEqual(roster.safePhoto('http://drive.google.com/thumbnail?id=abc'), '');
assert.strictEqual(roster.localHeadshot('assets/agents/enrique.jpg'), 'assets/agents/enrique.jpg');
assert.strictEqual(roster.localHeadshot('assets/agents/lilia.jpg'), 'assets/agents/lilia.jpg');
assert.strictEqual(roster.localHeadshot('javascript:alert(1)'), '');
assert.strictEqual(roster.localHeadshot('assets/logo-white.png'), '');
assert.strictEqual(roster.localHeadshot('assets/agents/../logo.png'), '');

const gs = fs.readFileSync(path.join(__dirname, '../apps-script/RosterPublic.gs'), 'utf8');
['publicAgents', 'saveAgentPhoto', 'EB_Agents', 'ROSTER_PRIVATE', 'photoUrl', 'photoFileId', 'ANYONE_WITH_LINK'].forEach(function (part) {
  assert.ok(gs.indexOf(part) >= 0, part);
});
['address', 'ssn', 'tin', 'split', 'password'].forEach(function (part) {
  assert.ok(roster.PRIVATE.test(part), part);
  assert.ok(gs.indexOf(part) >= 0, 'script mentions ' + part);
});

console.log('roster-public tests passed');
