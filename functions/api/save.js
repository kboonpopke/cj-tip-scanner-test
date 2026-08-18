export async function onRequestPost(context) {

  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwEZedspWK4VTSBcddfkOmbi4JSeGQ-8F9wjn1Fg4p-xsd8ACXMusfb_hc9x6uvbdQ8Vg/exec";


  /*************************************************
   * REQUEST ID
   *
   * ใช้สำหรับตาม Error ใน Cloudflare
   *************************************************/

  const requestId =
    crypto.randomUUID();


  try {

    /*************************************************
     * 1. READ REQUEST
     *************************************************/

    let payload;


    try {

      payload =
        await context.request.json();

    } catch (error) {

      return jsonResponse(
        {
          success: false,
          message:
            "ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาเปิดหน้าใหม่แล้วลองอีกครั้ง",
          requestId:
            requestId
        },
        400
      );

    }


    /*************************************************
     * 2. VALIDATE
     *************************************************/

    if (
      !payload ||
      typeof payload !== "object"
    ) {

      return jsonResponse(
        {
          success: false,
          message:
            "ไม่พบข้อมูลรายการ",
          requestId:
            requestId
        },
        400
      );

    }


    const workOrder =
      cleanText(
        payload.workOrder
      );


    const operator =
      cleanText(
        payload.operator
      );


    const action =
      cleanText(
        payload.action
      );


    const date =
      cleanText(
        payload.date
      );


    const time =
      cleanText(
        payload.time
      );


    const remark =
      cleanText(
        payload.remark
      );


    if (
      !workOrder
    ) {

      return jsonResponse(
        {
          success: false,
          message:
            "ไม่พบเลขใบงาน TRIP กรุณาสแกนใหม่",
          requestId:
            requestId
        },
        400
      );

    }


    if (
      !operator
    ) {

      return jsonResponse(
        {
          success: false,
          message:
            action === "คืน"
              ? "กรุณาระบุชื่อผู้คืน"
              : "กรุณาระบุชื่อผู้รับ",
          requestId:
            requestId
        },
        400
      );

    }


    if (
      action !== "รับ" &&
      action !== "คืน"
    ) {

      return jsonResponse(
        {
          success: false,
          message:
            "ประเภทการทำรายการไม่ถูกต้อง",
          requestId:
            requestId
        },
        400
      );

    }


    /*************************************************
     * 3. NORMALIZE PAYLOAD
     *************************************************/

    const normalizedPayload = {

      workOrder:
        workOrder,

      operator:
        operator,

      action:
        action,

      date:
        date,

      time:
        time,

      remark:
        remark

    };


    /*************************************************
     * 4. TIMEOUT
     *
     * ให้เวลาระบบ Google 20 วินาที
     *************************************************/

    const controller =
      new AbortController();


    const timeoutId =
      setTimeout(
        function() {

          controller.abort();

        },
        20000
      );


    let response;


    try {

      /*************************************************
       * 5. SEND TO APPS SCRIPT
       *************************************************/

      response =
        await fetch(
          APPS_SCRIPT_URL,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json; charset=utf-8",

              "Accept":
                "application/json, text/plain, */*",

              "Cache-Control":
                "no-cache",

              "Pragma":
                "no-cache"

            },

            body:
              JSON.stringify(
                normalizedPayload
              ),

            /*
             * Google ContentService
             * จะ redirect ไป googleusercontent
             */

            redirect:
              "follow",

            signal:
              controller.signal

          }
        );


    } catch (fetchError) {

      clearTimeout(
        timeoutId
      );


      if (
        fetchError &&
        fetchError.name ===
        "AbortError"
      ) {

        console.error(
          "APPS_SCRIPT_TIMEOUT",
          requestId
        );


        return jsonResponse(
          {
            success: false,
            message:
              "ระบบใช้เวลาตอบสนองนานเกินไป กรุณาตรวจสอบในรายงานก่อนกดบันทึกซ้ำ",
            requestId:
              requestId
          },
          504
        );

      }


      console.error(
        "APPS_SCRIPT_FETCH_ERROR",
        requestId,
        String(fetchError)
      );


      return jsonResponse(
        {
          success: false,
          message:
            "ไม่สามารถเชื่อมต่อระบบบันทึกข้อมูลได้ กรุณาลองใหม่",
          requestId:
            requestId
        },
        502
      );

    } finally {

      clearTimeout(
        timeoutId
      );

    }


    /*************************************************
     * 6. READ RESPONSE
     *************************************************/

    const text =
      await response.text();


    const contentType =
      String(
        response.headers.get(
          "content-type"
        ) || ""
      )
      .toLowerCase();


    /*************************************************
     * LOG เฉพาะ Server
     *
     * ผู้ใช้จะไม่เห็น HTML ของ Google
     *************************************************/

    console.log(
      JSON.stringify(
        {
          requestId:
            requestId,

          status:
            response.status,

          ok:
            response.ok,

          redirected:
            response.redirected,

          finalUrl:
            response.url,

          contentType:
            contentType,

          responseLength:
            text.length

        }
      )
    );


    /*************************************************
     * 7. HTTP ERROR
     *************************************************/

    if (
      !response.ok
    ) {

      console.error(
        "APPS_SCRIPT_HTTP_ERROR",
        requestId,
        response.status
      );


      return jsonResponse(
        {
          success: false,
          message:
            "ระบบ Google ตอบกลับผิดปกติ กรุณาลองใหม่",
          requestId:
            requestId
        },
        502
      );

    }


    /*************************************************
     * 8. DETECT HTML
     *
     * ป้องกันหน้า Login /
     * Permission /
     * Google Error
     *************************************************/

    if (
      looksLikeHtml(
        text,
        contentType
      )
    ) {

      console.error(
        "APPS_SCRIPT_RETURNED_HTML",
        requestId,
        response.url,
        text.substring(
          0,
          300
        )
      );


      return jsonResponse(
        {
          success: false,

          message:
            "ระบบ Google ไม่ตอบกลับข้อมูลตามปกติ กรุณาลองใหม่ หรือแจ้ง IT",

          requestId:
            requestId
        },
        502
      );

    }


    /*************************************************
     * 9. PARSE JSON
     *************************************************/

    let result;


    try {

      result =
        JSON.parse(
          text
        );

    } catch (parseError) {

      console.error(
        "INVALID_JSON",
        requestId,
        text.substring(
          0,
          300
        )
      );


      return jsonResponse(
        {
          success: false,
          message:
            "ระบบบันทึกข้อมูลตอบกลับผิดปกติ กรุณาแจ้ง IT",
          requestId:
            requestId
        },
        502
      );

    }


    /*************************************************
     * 10. VALIDATE RESULT
     *************************************************/

    if (
      !result ||
      typeof result !== "object"
    ) {

      return jsonResponse(
        {
          success: false,
          message:
            "ไม่พบผลการบันทึกจากระบบ",
          requestId:
            requestId
        },
        502
      );

    }


    /*************************************************
     * เพิ่ม Request ID เฉพาะกรณี Error
     *************************************************/

    if (
      result.success === false
    ) {

      result.requestId =
        requestId;

    }


    /*************************************************
     * 11. SUCCESS
     *************************************************/

    return jsonResponse(
      result,
      200
    );


  } catch (error) {

    console.error(
      "SAVE_API_FATAL",
      requestId,
      error &&
      error.stack
        ? error.stack
        : String(error)
    );


    return jsonResponse(
      {
        success: false,

        message:
          "ระบบเกิดข้อผิดพลาด กรุณาลองใหม่ หรือแจ้ง IT",

        requestId:
          requestId
      },
      500
    );

  }

}


/*************************************************
 * OTHER METHODS
 *
 * ถ้ามีคนเปิด /api/save ตรง ๆ
 *************************************************/

export async function onRequestGet() {

  return jsonResponse(
    {
      success: true,
      service:
        "CJ TRIP Save API",
      status:
        "ONLINE"
    },
    200
  );

}


/*************************************************
 * DETECT HTML RESPONSE
 *************************************************/

function looksLikeHtml(
  text,
  contentType
) {

  const value =
    String(
      text || ""
    )
    .trim()
    .toLowerCase();


  if (
    contentType.includes(
      "text/html"
    )
  ) {

    return true;

  }


  if (
    value.startsWith(
      "<!doctype html"
    )
  ) {

    return true;

  }


  if (
    value.startsWith(
      "<html"
    )
  ) {

    return true;

  }


  if (
    value.includes(
      "<head>"
    ) &&
    value.includes(
      "</html>"
    )
  ) {

    return true;

  }


  if (
    value.includes(
      "accounts.google.com"
    )
  ) {

    return true;

  }


  if (
    value.includes(
      "servicelogin"
    )
  ) {

    return true;

  }


  return false;

}


/*************************************************
 * CLEAN TEXT
 *************************************************/

function cleanText(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(
    value
  )
  .trim();

}


/*************************************************
 * JSON RESPONSE
 *************************************************/

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
          "no-store, no-cache, must-revalidate, max-age=0",

        "Pragma":
          "no-cache",

        "Expires":
          "0"

      }
    }
  );

}
