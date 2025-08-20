import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';
import axios from 'axios';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    unit: number | null;
};

interface Organization {
    id: number;
    name: string;
    level: number;
    level_name: string;
    parent_id: number | null;
    parent_name: string | null;
    address: string | null;
    display_name: string;
}

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        unit: null,
    });

    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [unitSearchTerm, setUnitSearchTerm] = useState<string>('');
    const [isUnitSelectOpen, setIsUnitSelectOpen] = useState<boolean>(false);
    const [isLoadingOrganizations, setIsLoadingOrganizations] = useState<boolean>(false);

    // Fetch organizations data
    useEffect(() => {
        const fetchOrganizations = async () => {
            setIsLoadingOrganizations(true);
            try {
                const response = await axios.get('/api/organizations');
                if (response.data.success) {
                    setOrganizations(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch organizations:', error);
            } finally {
                setIsLoadingOrganizations(false);
            }
        };

        fetchOrganizations();
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    // Filter organizations based on search term
    const filteredOrganizations = organizations.filter(org =>
        org.display_name.toLowerCase().includes(unitSearchTerm.toLowerCase()) ||
        org.name.toLowerCase().includes(unitSearchTerm.toLowerCase())
    );

    const handleUnitSelect = (value: string) => {
        if (value === "none") {
            setData('unit', null);
            setUnitSearchTerm('');
        } else {
            const selectedOrg = organizations.find(org => org.id.toString() === value);
            if (selectedOrg) {
                setData('unit', parseInt(value));
                setUnitSearchTerm(selectedOrg.display_name);
            }
        }
        setIsUnitSelectOpen(false);
    };

    const clearUnitSelection = () => {
        setData('unit', null);
        setUnitSearchTerm('');
    };

    // Get selected unit name for display
    const selectedUnitName = data.unit
        ? organizations.find(org => org.id === data.unit)?.display_name
        : null;

    return (
        <AuthLayout title="Create an account" description="Enter your details below to create your account">
            <Head title="Register" />
            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder="Full name"
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            tabIndex={2}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={processing}
                            placeholder="email@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="unit">Unit</Label>
                        <div className="relative">
                            <Input
                                id="unit_search"
                                value={unitSearchTerm}
                                onChange={(e) => {
                                    setUnitSearchTerm(e.target.value);
                                    setIsUnitSelectOpen(true);
                                }}
                                onFocus={() => setIsUnitSelectOpen(true)}
                                placeholder={isLoadingOrganizations ? "Loading organizations..." : "Search unit organization..."}
                                className="pr-20"
                                disabled={isLoadingOrganizations || processing}
                                tabIndex={3}
                                required
                            />
                            {selectedUnitName && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1 h-8 px-2 text-xs"
                                    onClick={clearUnitSelection}
                                    disabled={processing}
                                >
                                    Clear
                                </Button>
                            )}

                            {isUnitSelectOpen && !isLoadingOrganizations && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    <div
                                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm border-b"
                                        onClick={() => handleUnitSelect("none")}
                                    >
                                        <span className="font-medium">None</span>
                                        <div className="text-xs text-gray-500">No unit assigned</div>
                                    </div>
                                    {filteredOrganizations.length > 0 ? (
                                        filteredOrganizations.map((org) => (
                                            <div
                                                key={org.id}
                                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm border-b last:border-b-0"
                                                onClick={() => handleUnitSelect(org.id.toString())}
                                            >
                                                <div className="font-medium">{org.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {org.level_name}
                                                    {org.parent_name && ` • Parent: ${org.parent_name}`}
                                                    {org.address && ` • ${org.address}`}
                                                </div>
                                            </div>
                                        ))
                                    ) : unitSearchTerm && (
                                        <div className="px-3 py-2 text-sm text-gray-500">
                                            No organizations found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Show selected unit organization */}
                        {selectedUnitName && (
                            <div className="text-sm text-gray-600 mt-1">
                                Selected: <span className="font-medium">{selectedUnitName}</span>
                            </div>
                        )}
                        <InputError message={errors.unit} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={4}
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            disabled={processing}
                            placeholder="Password"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm password</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            required
                            tabIndex={5}
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            disabled={processing}
                            placeholder="Confirm password"
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button type="submit" className="mt-2 w-full" tabIndex={6} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Create account
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-sm">
                    Already have an account?{' '}
                    <TextLink href={route('login')} tabIndex={7}>
                        Log in
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}