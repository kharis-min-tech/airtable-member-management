/**
 * Component Showcase Page
 * Requirements: 5.3
 * - Display all Tailus UI components with different variants
 * - Include theme toggle demonstration
 */

import { useState } from 'react';
import { Inbox, AlertCircle, CheckCircle, Info, Users, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/tailus-ui/Card';
import { Button } from '../../components/tailus-ui/Button';
import { Input } from '../../components/tailus-ui/Input';
import { Select } from '../../components/tailus-ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../components/tailus-ui/Table';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

const sampleTableData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Member', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Leader', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Member', status: 'Inactive' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Pastor', status: 'Active' },
];

const selectOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
  { value: 'disabled', label: 'Disabled Option', disabled: true },
];

export function ComponentShowcase() {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
          Component Showcase
        </h1>
        <p className="mt-2 text-text-secondary-light dark:text-text-secondary-dark">
          Preview all Tailus UI components with Kharis brand styling. Current theme: <strong>{theme}</strong>
        </p>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Toggle theme:</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Cards Section */}
      <section>
        <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
          Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Default Card */}
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This is a default card with subtle shadow styling.</p>
            </CardContent>
            <CardFooter>
              <Button variant="primary" size="sm">Action</Button>
            </CardFooter>
          </Card>

          {/* Elevated Card */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card has a more prominent shadow for emphasis.</p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="sm">Action</Button>
            </CardFooter>
          </Card>

          {/* Outlined Card */}
          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Outlined Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card uses a border instead of shadow.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </section>


      {/* KPI Cards Section */}
      <section>
        <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
          KPI Cards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 dark:bg-primary-dark/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary dark:text-primary-dark" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Total Members</p>
                  <p className="text-2xl font-bold text-accent dark:text-accent-dark">1,234</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Attendance</p>
                  <p className="text-2xl font-bold text-accent dark:text-accent-dark">89%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Events</p>
                  <p className="text-2xl font-bold text-accent dark:text-accent-dark">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 dark:bg-accent-dark/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-accent dark:text-accent-dark" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Growth</p>
                  <p className="text-2xl font-bold text-accent dark:text-accent-dark">+15%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Buttons Section */}
      <section>
        <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
          Buttons
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Variants */}
              <div>
                <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-3">Variants</p>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-3">Sizes</p>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </div>
              </div>

              {/* Disabled */}
              <div>
                <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-3">Disabled State</p>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" disabled>Disabled Primary</Button>
                  <Button variant="outline" disabled>Disabled Outline</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Form Controls Section */}
      <section>
        <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
          Form Controls
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Input Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Default Input"
                  placeholder="Enter text..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Input
                  label="With Error"
                  placeholder="Enter email..."
                  error="Please enter a valid email address"
                />
                <Input
                  label="Disabled Input"
                  placeholder="Cannot edit..."
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Select Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Select Component</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  label="Default Select"
                  options={selectOptions}
                  placeholder="Choose an option..."
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                />
                <Select
                  label="With Error"
                  options={selectOptions}
                  error="Please select an option"
                />
                <Select
                  label="Disabled Select"
                  options={selectOptions}
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>


      {/* Table Section */}
      <section>
        <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
          Table
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Member List Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>Name</TableCell>
                  <TableCell header>Email</TableCell>
                  <TableCell header>Role</TableCell>
                  <TableCell header>Status</TableCell>
                  <TableCell header>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleTableData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.status === 'Active'
                            ? 'bg-success/10 text-success'
                            : 'bg-gray-100 dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark'
                        }`}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Loading & Empty States Section */}
      <section>
        <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
          Loading & Empty States
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loading Spinner */}
          <Card>
            <CardHeader>
              <CardTitle>Loading Spinner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <Button
                    variant={showLoading ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setShowLoading(!showLoading)}
                  >
                    {showLoading ? 'Hide' : 'Show'} Loading
                  </Button>
                </div>
                {showLoading && (
                  <div className="py-8">
                    <LoadingSpinner text="Loading data..." size="md" fullScreen={false} />
                  </div>
                )}
                {!showLoading && (
                  <div className="flex gap-8 items-end py-4">
                    <div className="text-center">
                      <LoadingSpinner size="sm" fullScreen={false} />
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">Small</p>
                    </div>
                    <div className="text-center">
                      <LoadingSpinner size="md" fullScreen={false} />
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">Medium</p>
                    </div>
                    <div className="text-center">
                      <LoadingSpinner size="lg" fullScreen={false} />
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">Large</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          <Card>
            <CardHeader>
              <CardTitle>Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <Button
                    variant={showEmpty ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setShowEmpty(!showEmpty)}
                  >
                    {showEmpty ? 'Hide' : 'Show'} Empty State
                  </Button>
                </div>
                {showEmpty && (
                  <EmptyState
                    icon={Inbox}
                    title="No members found"
                    description="There are no members matching your search criteria. Try adjusting your filters."
                    action={<Button variant="primary" size="sm">Add Member</Button>}
                  />
                )}
                {!showEmpty && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <EmptyState
                        icon={AlertCircle}
                        title="No alerts"
                        description="All systems operational"
                      />
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <EmptyState
                        icon={Info}
                        title="No data"
                        description="Select a date range"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Responsive Grid Demo */}
      <section>
        <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark mb-6">
          Responsive Grid Layout
        </h2>
        <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">
          Resize your browser to see the grid adapt: 1 column on mobile, 2 on tablet, 4 on desktop.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((num) => (
            <Card key={num} variant="outlined">
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-primary dark:text-primary-dark">{num}</p>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
                    Grid Item {num}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ComponentShowcase;
