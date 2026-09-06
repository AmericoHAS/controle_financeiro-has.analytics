import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

async function authorize(req: Request) {
  const token = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const admin = getSupabaseAdmin();

  const {
    data,
    error,
  } = await admin.auth.getUser(token);

  if (
    error ||
    !data.user ||
    data.user.email !== process.env.ADMIN_EMAIL
  ) {
    return null;
  }

  return admin;
}

export async function GET(req: Request) {
  const admin = await authorize(req);

  if (!admin) {
    return Response.json(
      {
        error: "Não autorizado.",
      },
      {
        status: 403,
      }
    );
  }

  const {
    data,
    error,
  } = await admin
    .from("access_requests")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return Response.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    rows: data ?? [],
  });
}

export async function POST(req: Request) {
  const admin = await authorize(req);

  if (!admin) {
    return Response.json(
      {
        error: "Não autorizado.",
      },
      {
        status: 403,
      }
    );
  }

  const body = (await req.json()) as {
    id?: number;
    type?: "approve" | "reject" | "resend";
  };

  if (
    !body.id ||
    !["approve", "reject", "resend"].includes(
      body.type || ""
    )
  ) {
    return Response.json(
      {
        error: "Solicitação inválida.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: requestRow,
    error: requestError,
  } = await admin
    .from("access_requests")
    .select("*")
    .eq("id", body.id)
    .single();

  if (
    requestError ||
    !requestRow
  ) {
    return Response.json(
      {
        error:
          "Pedido não encontrado.",
      },
      {
        status: 404,
      }
    );
  }

  /* =======================================================
     RECUSAR
     ======================================================= */

  if (body.type === "reject") {
    const {
      error: updateError,
    } = await admin
      .from("access_requests")
      .update({
        status: "rejected",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", body.id);

    if (updateError) {
      return Response.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      ok: true,
      status: "rejected",
    });
  }

  /* =======================================================
     APROVAR OU REENVIAR CONVITE
     ======================================================= */

  const email =
    String(requestRow.email || "")
      .trim()
      .toLowerCase();

  if (!email) {
    return Response.json(
      {
        error:
          "A solicitação não possui e-mail válido.",
      },
      {
        status: 400,
      }
    );
  }

  const baseUrl =
  process.env
    .NEXT_PUBLIC_APP_URL ||
  "https://financial.hasanalytics.com.br";

const redirectTo =
  `${baseUrl}/definir-senha`;

  /*
    O inviteUserByEmail cria o usuário
    e envia o convite pelo próprio
    sistema de autenticação do Supabase.
  */
  const {
    data: inviteData,
    error: inviteError,
  } =
    await admin.auth.admin
      .inviteUserByEmail(
        email,
        {
          redirectTo,

          data: {
            name:
              requestRow.name ||
              "",
          },
        }
      );

  /*
    Se o usuário já existir,
    um novo invite tradicional
    pode falhar. Nesse caso,
    tratamos abaixo.
  */
  if (inviteError) {
    const message =
      inviteError.message
        .toLowerCase();

    const alreadyExists =
      message.includes(
        "already"
      ) ||
      message.includes(
        "registered"
      ) ||
      message.includes(
        "exists"
      );

    if (!alreadyExists) {
      return Response.json(
        {
          error:
            inviteError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
      Busca o usuário existente.
    */
    const {
      data: usersData,
      error: usersError,
    } =
      await admin.auth.admin
        .listUsers({
          page: 1,
          perPage: 1000,
        });

    if (usersError) {
      return Response.json(
        {
          error:
            usersError.message,
        },
        {
          status: 500,
        }
      );
    }

    const existingUser =
      usersData.users.find(
        (user) =>
          user.email
            ?.toLowerCase() ===
          email
      );

    if (!existingUser) {
      return Response.json(
        {
          error:
            "O usuário já existe, mas não foi localizado para atualização.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Se o usuário já existe,
      não alteramos senha automaticamente.
      Apenas confirmamos o cadastro
      administrativo.
    */
    const {
      error: updateUserError,
    } =
      await admin.auth.admin
        .updateUserById(
          existingUser.id,
          {
            email_confirm: true,

            user_metadata: {
              ...existingUser
                .user_metadata,

              name:
                requestRow.name ||
                existingUser
                  .user_metadata
                  ?.name ||
                "",
            },
          }
        );

    if (updateUserError) {
      return Response.json(
        {
          error:
            updateUserError.message,
        },
        {
          status: 500,
        }
      );
    }
  }

  /* =======================================================
     ATUALIZA SOLICITAÇÃO
     ======================================================= */

  const now =
    new Date().toISOString();

  const updatePayload =
    body.type === "approve"
      ? {
          status:
            "approved",

          approved_at:
            now,

          updated_at:
            now,
        }
      : {
          updated_at:
            now,
        };

  const {
    error: updateRequestError,
  } = await admin
    .from("access_requests")
    .update(updatePayload)
    .eq("id", body.id);

  if (updateRequestError) {
    return Response.json(
      {
        error:
          updateRequestError.message,
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    ok: true,
    email,
    status:
      body.type === "approve"
        ? "approved"
        : requestRow.status,
    invited:
      Boolean(inviteData?.user),
  });
}