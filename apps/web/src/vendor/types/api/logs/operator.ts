// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export interface ILogSearchOperatorsCommon {
	Equal: 'EQ';
	'Not Equal': 'NEQ';
	'Greater Than': 'GT';
	'Less Than': 'LT';
	'Greater Than Equal': 'GTE';
	'Less Than Equal': 'LTE';
	In: 'IN';
	'Not In': 'NIN';
}

export interface ILogSearchOperatorsString extends ILogSearchOperatorsCommon {
	Like: 'LIKE';
	'Not Like': 'NLIKE';
}
