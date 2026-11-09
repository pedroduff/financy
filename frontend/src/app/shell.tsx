import { NavLink, Outlet } from 'react-router-dom';
import { Avatar } from '../components/ui/avatar';
import { FinanceDialogs } from '../features/finance/dialogs';
import { assets } from '../lib/assets';
import { useCurrentUser } from './providers';

export function Shell() {
  const { data: user } = useCurrentUser();
  return (
    <FinanceDialogs>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <header className="navbar">
        <div className="navbar-inner">
          <NavLink className="brand" to="/" aria-label="Financy — dashboard">
            <img src={assets.dashboard.logo} alt="Financy" />
          </NavLink>
          <nav aria-label="Navegação principal">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/transactions">Transações</NavLink>
            <NavLink to="/categories">Categorias</NavLink>
          </nav>
          <NavLink
            className="avatar-link"
            to="/profile"
            aria-label="Meu perfil"
          >
            {user && <Avatar key={user.id} user={user} />}
          </NavLink>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>
        <Outlet />
      </div>
    </FinanceDialogs>
  );
}
