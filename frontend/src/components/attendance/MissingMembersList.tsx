import type { Member, Service } from '../../types';

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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!serviceFrom || !serviceTo) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Select both services to see comparison
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500">
            Present in {formatServiceName(serviceFrom)}, missing from{' '}
            {formatServiceName(serviceTo)}
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {members.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400">
          No missing members found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Phone
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Follow-up Owner
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                    {member.email && (
                      <div className="text-xs text-gray-500">{member.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {member.phone || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {member.followUpOwner || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Member':
      return 'bg-green-100 text-green-800';
    case 'First Timer':
      return 'bg-blue-100 text-blue-800';
    case 'Returner':
      return 'bg-purple-100 text-purple-800';
    case 'Evangelism Contact':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default MissingMembersList;
