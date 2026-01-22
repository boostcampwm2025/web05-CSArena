import { login } from '@/feature/auth/auth.api';

export function useLoginModal() {
  const onClickLoginWithGithubBtn = () => {
    login();
  };

  return { onClickLoginWithGithubBtn };
}
