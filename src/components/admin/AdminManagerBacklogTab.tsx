import React from 'react';
import { ManagerLogView, ManagerLogViewProps } from '../ManagerLogView';

export type AdminManagerBacklogTabProps = ManagerLogViewProps;

export const AdminManagerBacklogTab: React.FC<AdminManagerBacklogTabProps> = (props) => {
  return <ManagerLogView {...props} isAdmin={true} />;
};

export default AdminManagerBacklogTab;
