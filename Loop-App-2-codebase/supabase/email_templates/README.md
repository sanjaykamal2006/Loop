# Supabase Email Templates for LOOP

## Reset Password Email Template

To ensure users receive the 6-digit OTP verification code instead of a magic link:

1. Open your **Supabase Dashboard**: [https://supabase.com/dashboard/project/molpzciemegendacaglt/auth/templates](https://supabase.com/dashboard/project/molpzciemegendacaglt/auth/templates)
2. In the left navigation, go to **Authentication** -> **Email Templates**.
3. Select **Reset Password**.
4. Set the **Subject**:
   ```
   Reset Password Code - LOOP
   ```
5. In the **Body** editor, paste the contents of `reset_password.html`:
   ```html
   <h2>Reset Password</h2>
   <p>Hello,</p>
   <p>Your 6-digit verification code to reset your LOOP account password is:</p>
   <div style="background-color: #000000; border: 2px solid #FFC554; border-radius: 12px; padding: 18px 24px; text-align: center; margin: 20px 0; display: inline-block;">
     <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FFC554; font-family: monospace;">{{ .Token }}</span>
   </div>
   <p>Enter this code in LOOP to choose a new password.</p>
   <div style="background-color: #2a2211; border: 1px solid #FFC554; border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #FFC554; font-size: 13px;">
     <strong>⚠️ Note:</strong> If you don't see this in your Inbox in the future, please check your <strong>Spam / Junk</strong> folder.
   </div>
   <p style="color: #888888; font-size: 12px; margin-top: 24px;">If you didn't request a password reset, you can safely ignore this email.</p>
   ```
6. Click **Save Changes**.
