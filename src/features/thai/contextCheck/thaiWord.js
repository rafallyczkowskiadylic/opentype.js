/**
 * Thai word context checkers
 */
function thaiWordStartCheck(contextParams) {
    const char = contextParams.current;
    const prevChar = contextParams.get(-1);
    return (prevChar === null) && char;
}

function thaiWordEndCheck(contextParams) {
    const nextChar = contextParams.get(1);
    return (nextChar === null);
}

export default {
    startCheck: thaiWordStartCheck,
    endCheck: thaiWordEndCheck
};
