export async function onRequestGet(context) {

  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwEZedspWK4VTSBcddfkOmbi4JSeGQ-8F9wjn1Fg4p-xsd8ACXMusfb_hc9x6uvbdQ8Vg/exec";


  const url =
    new URL(
      context.request.url
    );


  const workOrder =
    String(
      url.searchParams.get(
        "workOrder"
      ) || ""
    ).trim();


  if (
    !workOrder
  ) {

    return jsonResponse(
      {
        success: false,
        message:
          "ไม่พบเลขที่ใบงาน TRIP"
      },
      400
    );

  }


  const target =
    APPS_SCRIPT_URL +
    "?api=lookup&workOrder=" +
    encodeURIComponent(
      workOrder
    );


  try {

    const response =
      await fetch(
        target,
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json, text/plain, */*"
          },
          redirect: "follow"
        }
      );


    const text =
      await response.text();


    let result;


    try {

      result =
        JSON.parse(
          text
        );

    } catch (error) {

      return jsonResponse(
        {
          success: false,
          message:
            "Apps Script ตอบกลับไม่ใช่ JSON"
        },
        502
      );

    }


    return jsonResponse(
      result,
      200
    );


  } catch (error) {

    return jsonResponse(
      {
        success: false,
        message:
          error.message ||
          String(error)
      },
      500
    );

  }

}


function jsonResponse(
  data,
  status = 200
) {

  return new Response(
    JSON.stringify(
      data
    ),
    {
      status:
        status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store"
      }
    }
  );

}
