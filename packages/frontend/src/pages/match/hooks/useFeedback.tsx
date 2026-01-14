import { useUser } from '@/feature/auth/useUser';
import { useState } from 'react';

export function useFeedback() {
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmit, setIsSubmit] = useState<boolean>(false);

  const { setUserData } = useUser();

  const onClickSubmitBtn = async () => {
    if (isSubmitting || isSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: 'other',
          content: feedback.trim(),
        }),
      });

      if (res.ok) {
        setIsSubmit(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onClickCloseBtn = () => {
    setUserData((prev) => {
      if (!prev) {
        return prev;
      }

      return { ...prev, isSentFeedback: true };
    });
  };

  return { feedback, setFeedback, isSubmitting, isSubmit, onClickSubmitBtn, onClickCloseBtn };
}
