const { AuthClientTwoLegged, ObjectsApi } = require('forge-apis');

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_BUCKET } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
const BUCKET = FORGE_BUCKET || `${FORGE_CLIENT_ID.toLowerCase()}-basic-app`;
const INTERNAL_TOKEN_SCOPES = ['bucket:read', 'data:read'];
const PUBLIC_TOKEN_SCOPES = ['viewables:read'];

let internalAuthClient = new AuthClientTwoLegged(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, INTERNAL_TOKEN_SCOPES, true);
let publicAuthClient = new AuthClientTwoLegged(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, PUBLIC_TOKEN_SCOPES, true);

const urnify = (id) => Buffer.from(id).toString('base64').replace(/=/g, '');

async function getInternalToken() {
    if (!internalAuthClient.isAuthorized()) {
        await internalAuthClient.authenticate();
    }
    return internalAuthClient.getCredentials();
}

async function getPublicToken() {
    if (!publicAuthClient.isAuthorized()) {
        await publicAuthClient.authenticate();
    }
    return publicAuthClient.getCredentials();
}

async function listModels() {
    const token = await getInternalToken();
    let response = await new ObjectsApi().getObjects(BUCKET, { limit: 64 }, null, token);
    let objects = response.body.items;
    while (response.body.next) {
        const startAt = new URL(response.body.next).searchParams.get('startAt');
        response = await new ObjectsApi().getObjects(BUCKET, { limit: 64, startAt }, null, token);
        objects = objects.concat(response.body.items);
    }
    return objects.map(obj => ({
        name: obj.objectKey,
        urn: urnify(obj.objectId)
    }));
}

module.exports = {
    getPublicToken,
    listModels
};
