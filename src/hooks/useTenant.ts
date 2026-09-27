import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBackoffice } from '../context/BackofficeContext';
import { useToast } from './useToast';
import { PATHS } from '../router/paths';

export function useTenant() {
  const { id } = useParams<{ id: string }>();
  const { tenants } = useBackoffice();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const tenant = tenants.find((t) => t.id === id);

  useEffect(() => {
    if (id && !tenant) {
      showToast(`Cliente com o identificador "${id}" não foi encontrado.`, 'error');
      navigate(PATHS.tenants.list, { replace: true });
    }
  }, [id, tenant, navigate, showToast]);

  return tenant;
}
