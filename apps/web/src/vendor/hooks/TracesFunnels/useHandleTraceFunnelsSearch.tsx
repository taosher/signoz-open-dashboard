// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
import { ChangeEvent, useState } from 'react';

const useHandleTraceFunnelsSearch = (): {
	searchQuery: string;
	handleSearch: (e: ChangeEvent<HTMLInputElement>) => void;
} => {
	const [searchQuery, setSearchQuery] = useState<string>('');

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchQuery(e.target.value);
	};

	return {
		searchQuery,
		handleSearch,
	};
};

export default useHandleTraceFunnelsSearch;
