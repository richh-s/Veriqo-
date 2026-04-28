import resend
from app.core.config import settings

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

async def send_workflow_email(to_email: str, to_name: str, subject: str, body: str) -> bool:
    if not settings.RESEND_API_KEY:
        print(f"MOCK WORKFLOW EMAIL to {to_email}: {subject}")
        return False

    html_body = body.replace('\n', '<br>')
    params = {
        "from": "Veriqo <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                {html_body}
            </div>
        """,
    }
    try:
        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Failed to send workflow email via Resend: {e}")
        return False


async def send_deactivation_email(email: str, full_name: str) -> None:
    if not settings.RESEND_API_KEY:
        print(f"MOCK EMAIL to {email}: Account deactivated for {full_name}")
        return

    params = {
        "from": "Veriqo <onboarding@resend.dev>",
        "to": [email],
        "subject": "Your Veriqo account has been deactivated",
        "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
                <h2 style="color: #dc2626;">Account Deactivated</h2>
                <p>Hello {full_name},</p>
                <p>Your Veriqo account has been <strong>deactivated</strong> by an administrator.</p>
                <p>You will no longer be able to log in to the platform.</p>
                <p style="margin-top: 24px;">If you believe this was done in error, please contact your workspace administrator.</p>
                <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">— The Veriqo Team</p>
            </div>
        """,
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        print(f"Failed to send deactivation email via Resend: {e}")


async def send_invitation_email(email: str, full_name: str, temp_password: str, role: str):
    if not settings.RESEND_API_KEY:
        print(f"MOCK EMAIL to {email}: Welcome {full_name}! Your temporary password is {temp_password}")
        return

    params = {
        "from": "Veriqo <onboarding@resend.dev>",
        "to": [email],
        "subject": "Welcome to Veriqo - You've been invited!",
        "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
                <h2 style="color: #2563eb;">Welcome to Veriqo!</h2>
                <p>Hello {full_name},</p>
                <p>You have been invited to join the platform as a <strong>{role}</strong>.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #64748b;">Your temporary login credentials:</p>
                    <p style="margin: 10px 0 0 0; font-size: 16px;"><strong>Email:</strong> {email}</p>
                    <p style="margin: 5px 0 0 0; font-size: 16px;"><strong>Password:</strong> {temp_password}</p>
                </div>
                <a href="http://localhost:3000/login" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Login to Dashboard</a>
                <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">If you did not expect this invitation, please ignore this email.</p>
            </div>
        """
    }

    try:
        resend.Emails.send(params)
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")
