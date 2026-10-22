// ПРИКЛАД серверу-посередника для справжнього ШІ (Supabase Edge Function).
// УВАГА: це шаблон. Він не перевірявся на вашому проєкті: розгорніть, протестуйте й за потреби поправте.
//
// Навіщо потрібен: ключ ШІ-сервісу НЕ можна класти в браузерний код (його вкрадуть).
// Тому сайт звертається до цієї функції, а ключ лежить лише на сервері.
//
// Розгортання (коротко):
//   1) Встановіть Supabase CLI, увійдіть:  supabase login   і  supabase link --project-ref <ваш-ref>
//   2) Покладіть цей файл у  supabase/functions/ai-assistant/index.ts
//   3) Секрети:  supabase secrets set ANTHROPIC_API_KEY=... AI_MODEL=claude-sonnet-5-5
//   4) Розгорніть:  supabase functions deploy ai-assistant
//   5) У config.js:  AI_ENDPOINT:'https://<ваш-ref>.supabase.co/functions/v1/ai-assistant'
// Запит вважається дозволеним, якщо передано JWT користувача Supabase (сайт додає його автоматично).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Ти — помічник з управління задачами в будівельній компанії (відділ, проєкти, задачі, підзадачі).
Відповідай українською, коротко й по справі. Поточну дату й дані відділу бачиш у КОНТЕКСТІ.
Поверни ТІЛЬКИ JSON без пояснень поза ним, формат:
{"reply":"текст відповіді користувачу","actions":[ ... ]}
Дії (actions) виконуватиме сайт після підтвердження користувача. Дозволені типи (використовуй лише id із КОНТЕКСТУ):
{"type":"create_task","title":"","start":"YYYY-MM-DD","end":"YYYY-MM-DD","who":["userId"],"project":"projectId","cat":"categoryId","subs":["підзадача"]}
{"type":"add_subtasks","task":"taskId","subs":["..."]}
{"type":"set_status","task":"taskId","status":"Не почато|Постійна задача|В процесі|Виконано"}
{"type":"set_dates","task":"taskId","start":"YYYY-MM-DD","end":"YYYY-MM-DD"}
{"type":"shift_dates","task":"taskId","days":3}
{"type":"assign","task":"taskId","who":["userId"],"replace":false}
{"type":"comment","task":"taskId","text":"","to":["userId"]}
{"type":"archive","task":"taskId"}
{"type":"create_project","name":""}
{"type":"create_category","name":""}
{"type":"create_milestone","project":"projectId","name":"","date":"YYYY-MM-DD","task":"текст автозадачі"}
Якщо питають про план на день/тиждень/місяць — розпиши його у reply за задачами з КОНТЕКСТУ й, якщо доречно, запропонуй дії set_dates.
Нічого не вигадуй: якщо даних бракує — запитай у reply й не додавай actions. Не видаляй задачі.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { message, history = [], context } = await req.json();
    const past = (history as { role: string; text: string }[])
      .slice(-8).map((h) => `${h.role === "user" ? "Користувач" : "Помічник"}: ${h.text}`).join("\n");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: 1800,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: `КОНТЕКСТ:\n${JSON.stringify(context)}\n\nПОПЕРЕДНЯ РОЗМОВА:\n${past}\n\nЗАПИТ:\n${message}`,
        }],
      }),
    });
    const j = await r.json();
    const text: string = (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    let out = { reply: text, actions: [] as unknown[] };
    if (m) { try { out = JSON.parse(m[0]); } catch (_) { /* лишаємо текст як є */ } }
    return new Response(JSON.stringify(out), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ reply: "Помилка сервера ШІ: " + (e as Error).message, actions: [] }),
      { headers: { ...cors, "content-type": "application/json" } });
  }
});
