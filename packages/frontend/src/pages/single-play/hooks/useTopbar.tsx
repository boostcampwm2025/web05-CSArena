import { useScene } from '@/feature/useScene';

export function useTopbar() {
  const { scene, setScene } = useScene();

  const onClickBackBtn = () => {
    if (scene !== 'single-play') {
      return;
    }

    setScene('home');
  };

  return { onClickBackBtn };
}
