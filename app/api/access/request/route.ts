import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { normalizeEmail } from "../../../access-utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
    };

    const name =
      body.name?.trim() || "";

    const email =
      normalizeEmail(
        body.email || ""
      );

    if (
      !name ||
      !email ||
      !email.includes("@")
    ) {
      return Response.json(
        {
          error:
            "Preencha nome e e-mail corretamente.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      getSupabaseAdmin();

    /* =====================================================
       VERIFICA SE JÁ EXISTE SOLICITAÇÃO
       ===================================================== */

    const {
      data: existingRequest,
      error: existingError,
    } = await admin
      .from("access_requests")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    /*
      Se já estiver aprovado,
      não cria uma nova solicitação.
    */
    if (
      existingRequest?.status ===
      "approved"
    ) {
      return Response.json({
        message:
          "Este e-mail já possui acesso aprovado. Utilize a tela de login para entrar.",
        alreadyApproved: true,
      });
    }

    /*
      Se estiver pendente,
      apenas atualizamos o nome/data.
      Se estiver recusado, volta para pendente.
    */
    if (existingRequest) {
      const {
        error: updateError,
      } = await admin
        .from("access_requests")
        .update({
          name,
          status: "pending",
          approved_at: null,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          existingRequest.id
        );

      if (updateError) {
        throw updateError;
      }
    } else {
      const {
        error: insertError,
      } = await admin
        .from("access_requests")
        .insert({
          name,
          email,
          status: "pending",
          updated_at:
            new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }
    }

    /* =====================================================
       NOTIFICA O ADMINISTRADOR
       ===================================================== */

    const resendKey =
      process.env
        .RESEND_API_KEY;

    const ownerEmail =
      process.env
        .ADMIN_EMAIL;

    if (
      resendKey &&
      ownerEmail
    ) {
      const safeName =
        escapeHtml(name);

      const safeEmail =
        escapeHtml(email);

      const appUrl =
        process.env
          .NEXT_PUBLIC_APP_URL ||
        "https://financial.hasanalytics.com.br";

      const response =
        await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${resendKey}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                from:
                  process.env
                    .RESEND_FROM_EMAIL ||
                  "HAS Financial <onboarding@resend.dev>",

                to: [
                  ownerEmail,
                ],

                subject:
                  "Nova solicitação de acesso — HAS Financial",

                html: `
                  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#173c40">
                    
                    <h2 style="margin-bottom:8px">
                      Nova solicitação de acesso
                    </h2>

                    <p style="color:#607a7d">
                      Uma nova pessoa solicitou acesso ao
                      <strong>HAS Financial</strong>.
                    </p>

                    <div style="
                      margin:24px 0;
                      padding:18px;
                      background:#f3f8f7;
                      border-radius:12px;
                    ">
                      <p style="margin:0 0 8px">
                        <strong>Nome:</strong>
                        ${safeName}
                      </p>

                      <p style="margin:0">
                        <strong>E-mail:</strong>
                        ${safeEmail}
                      </p>
                    </div>

                    <p>
                      Acesse a área administrativa para
                      aprovar ou recusar a solicitação.
                    </p>

                    <p style="margin-top:24px">
                      <a
                        href="${appUrl}/admin/requests"
                        style="
                          display:inline-block;
                          padding:12px 18px;
                          background:#087f7c;
                          color:#ffffff;
                          text-decoration:none;
                          border-radius:8px;
                          font-weight:bold;
                        "
                      >
                        Gerenciar acessos
                      </a>
                    </p>

                    <p style="
                      margin-top:30px;
                      color:#91a0a2;
                      font-size:12px;
                    ">
                      HAS Financial · HAS Analytics
                    </p>

                  </div>
                `,
              }),
          }
        );

      if (!response.ok) {
        console.error(
          "Erro ao enviar aviso ao administrador:",
          await response.text()
        );
      }
    }

    return Response.json({
      message:
        "Solicitação enviada. Você receberá um e-mail quando seu acesso for aprovado.",
    });
  } catch (error) {
    console.error(
      "Erro ao registrar solicitação:",
      error
    );

    return Response.json(
      {
        error:
          "Não foi possível registrar a solicitação agora.",
      },
      {
        status: 500,
      }
    );
  }
}