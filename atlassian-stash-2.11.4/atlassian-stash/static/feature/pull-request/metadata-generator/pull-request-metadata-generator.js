define('feature/pull-request/pull-request-metadata-generator', [
    'jquery',
    'util/text',
    'model/revision-reference',
    'exports'
], function (
    $,
    textUtil,
    RevisionRef,
    exports
) {

    var handlesNewlinesInTextCorrectly = ($('<div>').text('\n').text().length === 1);

    function generateTitleFromBranchName(branchNameOrRevisionRef){
        return textUtil.convertBranchNameToSentence((branchNameOrRevisionRef instanceof RevisionRef) ? branchNameOrRevisionRef.getDisplayId() : branchNameOrRevisionRef);
    }

    function generateDescriptionFromCommitTableRows(tableRows){
        if (!handlesNewlinesInTextCorrectly) {
            return;
        }

        var description = '',
            $tableRows = $(tableRows).filter(':not(.merge)'),
            messageIterator = _.bind(getCommitMessageFromTableRow, null, $tableRows.length > 1); //If there's only one commit, don't nest it in a list

        if ($tableRows.length) {
            description = _.map($tableRows, messageIterator)
                .reverse()              //oldest commits first.
                .join('')
                .replace(/\n+/g, '\n'); //Compress any multi-newline sequences into single newlines
        }

        return description;
    }

    function getCommitMessageFromTableRow(shouldNestInList, tableRow) {
        var message = $(tableRow).find('.message span').text();

        return (shouldNestInList ? convertMessageToListItem(message) : message);
    }

    function convertMessageToListItem(message) {
        // Turn the commit message into a list item.
        // Indent bullet lists (`*`,`+`,`-` and numeric `1.` style variants supported) so they are nested under the commit list.
        var bulletsRegex = /\n([ \t]*([\*\+\-]|\d+\.)\s)/g,
            bulletReplacement = '\n' + textUtil.indent('$1');

        return '\n* ' + message.replace(bulletsRegex, bulletReplacement) ;
    }

    exports.generateTitleFromBranchName = generateTitleFromBranchName;
    exports.generateDescriptionFromCommitsTableRows = generateDescriptionFromCommitTableRows;
});