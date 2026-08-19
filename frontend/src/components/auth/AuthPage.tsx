import { useLocation } from 'react-router'
import { AuthLayout } from './AuthLayout'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

export default function AuthPage() {
  const { pathname } = useLocation()

  return (
    <AuthLayout>
      {/* Keyed remount = CSS enter transition on login <-> register switch;
          the left visual panel stays mounted and never re-animates */}
      <div key={pathname} className="auth-enter">
        {pathname === '/register' ? <RegisterForm /> : <LoginForm />}
      </div>
    </AuthLayout>
  )
}