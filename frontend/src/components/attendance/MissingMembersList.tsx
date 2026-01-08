import type { Member, Service } from '../../types';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tailus-ui/Table';
import { Card } from '../tailus-ui/Card';
import { LoadingSpinner } from '../LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Users } from 'lucide-react';

interface MissingMembersListProps {
  title: string;
  serviceFrom: Service | null;
  serviceTo: Service | null;
  members: Member[];
  isLoading?: boolean;
}

function MissingMembersList({
  title,
  serviceFrom,
  serviceTo,
  members,
  isLoading = false,
}: MissingMembersListProps) {
  const formatServiceName = (service: Service | null) => {
    if (!service) return '...';
    const date = new Date(service.serviceDate);
    return `${service.serviceName} (${date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })})`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center">
          <LoadingSpinner text="Loading members..." />
        </div>
      </Card>
    );
  }

  if (!serviceFrom || !serviceTo) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">{title}</h3>
        <EmptyState
          icon={Users}
          title="Select services to compare"
          description="Select both services to see comparison"
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">{title}</h3>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Present in {formatServiceName(serviceFrom)}, missing from{' '}
            {formatServiceName(serviceTo)}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No missing members"
          description="No missing members found for this comparison"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell header>Name</TableCell>
              <TableCell header>Phone</TableCell>
              <TableCell header>Status</TableCell>
              <TableCell header>Follow-up Owner</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{member.fullName}</div>
                  {member.email && (
                    <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{member.email}</div>
                  )}
                </TableCell>
                <TableCell>{member.phone || '-'}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                      member.status
                    )}`}
                  >
                    {member.status}
                  </span>
                </TableCell>
                <TableCell>{member.followUpOwner || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Member':
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
    case 'First Timer':
      return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
    case 'Returner':
      return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300';
    case 'Evangelism Contact':
      return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  }
}

export default MissingMembersList;
