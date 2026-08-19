export async function onRequestPost(context) {

  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwEZedspWK4VTSBcddfkOmbi4JSeGQ-8F9wjn1Fg4p-xsd8ACXMusfb_hc9x6uvbdQ8Vg/exec";

  try {

    const payload =
      await context.request.json();

    const response =
      await fetch(
        APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json, text/plain, */*"
          },
          body: JSON.stringify(payload),
          redirect: "follow"
        }
      );

    const text =
      await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Apps Script ตอบกลับไม่ใช่ JSON"
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || String(error)
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );

  }

}


export async function onRequestGet() {

  return new Response(
    JSON.stringify({
      success: true,
      service: "CJ TRIP TEST API",
      status: "ONLINE"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );

}
