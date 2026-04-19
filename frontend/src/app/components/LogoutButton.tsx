// app/components/LogoutButton.tsx
import { signOut } from "../../../auth"

export default function LogoutButton() {
  return (
    <form action={async () => {
      "use server"
      await signOut({
        redirectTo: 
          `http://localhost:8080/realms/creatorflow/protocol/openid-connect/logout?client_id=creatorflow-app&post_logout_redirect_uri=http://localhost:3000/`
      })
    }}>
      <button type="submit">Sign Out</button>
    </form>
  )
}