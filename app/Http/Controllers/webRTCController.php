<?php


namespace App\Http\Controllers;

use Illuminate\Http\Request;

define("CHANNEL_ID", 'L0YEtshct5737BhN');
define("SECRET_KEY", 'wK2iRF0BhflRKNlSIXIkGVte0MhW9IXZ');

class webRTCController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public $client = null;

    public static $auth = [
        'channel_id' => CHANNEL_ID,
        'secret_key' => SECRET_KEY
    ];

    public function __construct()
    {
        $this->middleware('auth');
        // $this->client = \ScaleDrone\Client::create($auth);
       //  $this->client->rooms_list()
    }

    public function getCompleteListOfUsersAndRoms()
    {

        return $this->client->members_list();
    }

}
