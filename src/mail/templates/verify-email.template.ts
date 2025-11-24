export const verifyEmailTemplate = ({
  name,
  verificationUrl,
}: {
  name: string;
  verificationUrl: string;
}) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifica tu correo</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; }
    .title { font-size: 22px; font-weight: bold; color: #333; }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 20px;
      background-color: #007bff;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <p class="title">¡Hola ${name}!</p>

    <p>Para activar tu cuenta, verificá tu correo haciendo clic en este botón:</p>

    <a class="btn" href="${verificationUrl}">Verificar correo</a>

    <p style="margin-top: 30px; color: #777; font-size: 13px;">
      Si no solicitaste esta cuenta, podés ignorar este mensaje.
    </p>
  </div>
</body>
</html>
`;
