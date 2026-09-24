const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(path.join(root, 'main.js'), 'utf8'), context);
const translate = context.translate;
const key = 'test-key-not-a-real-credential';
const success = content => ({ ok: true, status: 200, data: {
    choices: [{ message: { content }, finish_reason: 'stop' }],
} });

function setup(config = {}, response = success('你好'), legacy = false) {
    const calls = [];
    const fetch = async (url, init) => {
        calls.push({ url, init });
        if (response instanceof Error) throw response;
        return response;
    };
    return { calls, options: {
        config: { apiKey: key, ...config },
        utils: legacy ? { http: { fetch } } : { tauriFetch: fetch },
    } };
}

async function rejectsMessage(run, expression) {
    await assert.rejects(run, error => expression.test(String(error)));
}

test('official Gemini endpoint sends a Pot JSON body with Bearer authentication', async () => {
    const { options, calls } = setup();
    assert.equal(await translate('Hello', 'auto', 'Simplified Chinese', options), '你好');
    assert.equal(calls.length, 1);
    const { url, init } = calls[0];
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    assert.equal(init.url, url);
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, `Bearer ${key}`);
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.equal(init.body.type, 'Json');
    assert.equal(init.body.payload.model, 'gemini-3.1-flash-lite');
    assert.equal(init.body.payload.stream, false);
    assert.equal(init.body.payload.messages[0].role, 'system');
    assert.match(init.body.payload.messages[1].content, /Simplified Chinese:[\s\S]*Hello$/);
    assert.equal('max_tokens' in init.body.payload, false);
});

for (const baseUrl of [
    ' https://proxy.example/v1/ ',
    'https://proxy.example/v1',
    'https://proxy.example/v1/chat/completions',
    'https://proxy.example/v1/chat/completions/',
]) {
    test(`custom endpoint: ${baseUrl}`, async () => {
        const { options, calls } = setup({ baseUrl, model: ' custom-gemini-model ' });
        await translate('Hello', 'English', 'Traditional Chinese', options);
        assert.equal(calls[0].url, 'https://proxy.example/v1/chat/completions');
        assert.equal(calls[0].init.body.payload.model, 'custom-gemini-model');
        assert.match(calls[0].init.body.payload.messages[1].content, /from English into Traditional Chinese/);
    });
}

test('preserves quoted translations and paragraph breaks', async () => {
    const { options } = setup({}, success('  "你好"\n\n第二段。  '));
    assert.equal(await translate('Hello', 'auto', 'zh', options), '"你好"\n\n第二段。');
});

test('supports the legacy Pot HTTP utility and JSON-string responses', async () => {
    const response = success('你好');
    response.data = JSON.stringify(response.data);
    const { options } = setup({}, response, true);
    assert.equal(await translate('Hello', 'auto', 'zh', options), '你好');
});

test('supports text content blocks without including other content types', async () => {
    const { options } = setup({}, success([
        { type: 'text', text: '你' }, { type: 'image_url' }, { type: 'text', text: '好' },
    ]));
    assert.equal(await translate('Hello', 'auto', 'zh', options), '你好');
});

test('empty source makes no API call', async () => {
    const { options, calls } = setup({ apiKey: '' });
    assert.equal(await translate(' \n ', 'auto', 'zh', options), '');
    assert.equal(calls.length, 0);
});

test('missing credentials and invalid target are rejected before a request', async () => {
    const missing = setup({ apiKey: ' ' });
    await rejectsMessage(() => translate('Hello', 'auto', 'zh', missing.options), /API 密钥/);
    assert.equal(missing.calls.length, 0);
    const invalid = setup();
    await rejectsMessage(() => translate('Hello', 'auto', 'auto', invalid.options), /目标语言/);
    assert.equal(invalid.calls.length, 0);
});

test('invalid URLs are rejected without transmitting credentials', async () => {
    for (const baseUrl of ['not-a-url', 'file:///tmp/api', 'https://user:pass@example.com/v1',
        'https://example.com/v1?key=foo', 'https://example.com/v1#fragment']) {
        const { options, calls } = setup({ baseUrl });
        await rejectsMessage(() => translate('Hello', 'auto', 'zh', options), /接口地址/);
        assert.equal(calls.length, 0);
    }
});

test('HTTP failures expose useful status and redact echoed credentials', async () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
        const { options, calls } = setup({}, { ok: false, status, data: {
            error: { message: `Rejected ${key}` },
        } });
        await assert.rejects(() => translate('Hello', 'auto', 'zh', options), error => {
            assert.match(String(error), new RegExp(`HTTP ${status}`));
            assert.match(String(error), /REDACTED/);
            assert.equal(String(error).includes(key), false);
            return true;
        });
        assert.equal(calls.length, 1);
    }
});

test('network errors redact credentials', async () => {
    const { options } = setup({}, new Error(`Connection failure ${key}`));
    await assert.rejects(() => translate('Hello', 'auto', 'zh', options), error =>
        String(error).includes('连接失败') && !String(error).includes(key));
});

test('malformed, absent and empty results are not returned as translations', async () => {
    for (const data of ['<html>Gateway failure</html>', {}, null,
        { choices: [] }, { choices: [{ message: { content: null } }] },
        { choices: [{ message: { content: '  ' } }] }]) {
        const { options } = setup({}, { ok: true, status: 200, data });
        await rejectsMessage(() => translate('Hello', 'auto', 'zh', options), /未返回译文/);
    }
});

test('truncated and filtered outputs are rejected rather than silently returned', async () => {
    for (const [reason, message] of [['length', /输出上限/], ['content_filter', /内容过滤/]]) {
        const response = success('incomplete');
        response.data.choices[0].finish_reason = reason;
        const { options } = setup({}, response);
        await rejectsMessage(() => translate('Hello', 'auto', 'zh', options), message);
    }
});

test('manifest exposes editable configuration and distinct language variants', () => {
    const info = JSON.parse(fs.readFileSync(path.join(root, 'info.json'), 'utf8'));
    assert.equal(info.plugin_type, 'translate');
    assert.ok(info.id.startsWith('plugin.'));
    assert.ok(fs.existsSync(path.join(root, info.icon)));
    for (const key of ['apiKey', 'model', 'baseUrl']) {
        assert.ok(info.needs.some(need => need.key === key && need.type === 'input'));
    }
    assert.notEqual(info.language.zh_cn, info.language.zh_tw);
    assert.notEqual(info.language.pt_pt, info.language.pt_br);
});
