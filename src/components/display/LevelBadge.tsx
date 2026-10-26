import { ExportOutlined } from '@ant-design/icons';

import { LEVEL_BADGE_CLASS, LEVEL_LINK_CLASS } from '../../utils/Experience/experienceBadgeClasses';
import { levelsFyiUrl } from '../../utils/Experience/levelsFyi';

export const LevelBadge = ({
  level,
  company,
}: {
  level?: string | null;
  company?: string | null;
}) => {
  if (!level) return null;
  const url = levelsFyiUrl(company);
  if (!url) return <span className={LEVEL_BADGE_CLASS}>{level}</span>;
  const label = `Pay bands at ${company} on Levels.fyi`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={LEVEL_LINK_CLASS}
    >
      {level}
      <ExportOutlined style={{ fontSize: 8 }} />
    </a>
  );
};

export default LevelBadge;
