import { getProfileImageUrl } from './utils';

type ProfileAvatarProps = {
  profileImage: string | null | undefined;
  nickname?: string;
  size?: 'sm' | 'md' | 'lg';
  borderStyle?: 'cyan' | 'white';
};

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-16 w-16',
};

const iconSizeClasses = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
};

const borderClasses = {
  cyan: 'border-2 border-cyan-400',
  white: 'border-2 border-white',
};

export default function ProfileAvatar({
  profileImage,
  nickname,
  size = 'md',
  borderStyle = 'cyan',
}: ProfileAvatarProps) {
  const imageUrl = getProfileImageUrl(profileImage);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={nickname}
        className={`flex-shrink-0 rounded-lg object-cover ${sizeClasses[size]} ${borderClasses[borderStyle]}`}
      />
    );
  }

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 ${sizeClasses[size]} ${borderClasses[borderStyle]}`}
    >
      <i className={`ri-user-star-line text-white ${iconSizeClasses[size]}`} />
    </div>
  );
}
